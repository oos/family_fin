#!/usr/bin/env python3
"""
Family Finance Restore System
Restore database and files from backup
"""

import os
import shutil
import gzip
import json
import subprocess
import datetime
from pathlib import Path

class FamilyFinanceRestore:
    def __init__(self, project_root="/Users/oos/family_fin"):
        self.project_root = Path(project_root)
        self.backup_root = self.project_root / "backups"
        self.db_path = self.project_root / "instance" / "family_finance.db"
        self.uploads_dir = self.project_root / "uploads"
        
        # Create necessary directories
        self.uploads_dir.mkdir(parents=True, exist_ok=True)
        (self.project_root / "instance").mkdir(parents=True, exist_ok=True)
    
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
    
    def list_available_backups(self):
        """List all available backups"""
        self.log("Available backups:")
        
        # List database backups
        db_backups = list(self.backup_root.glob("database/family_finance_*.db.gz"))
        if db_backups:
            self.log("\nDatabase backups:")
            for i, backup in enumerate(sorted(db_backups, reverse=True), 1):
                size = backup.stat().st_size
                date = datetime.datetime.fromtimestamp(backup.stat().st_mtime)
                self.log(f"  {i}. {backup.name} ({size:,} bytes) - {date.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # List file backups
        file_backups = list(self.backup_root.glob("files/uploads_*.tar.gz"))
        if file_backups:
            self.log("\nFile backups:")
            for i, backup in enumerate(sorted(file_backups, reverse=True), 1):
                size = backup.stat().st_size
                date = datetime.datetime.fromtimestamp(backup.stat().st_mtime)
                self.log(f"  {i}. {backup.name} ({size:,} bytes) - {date.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # List manifest files
        manifest_files = list(self.backup_root.glob("backup_manifest_*.json"))
        if manifest_files:
            self.log("\nBackup manifests:")
            for i, manifest in enumerate(sorted(manifest_files, reverse=True), 1):
                date = datetime.datetime.fromtimestamp(manifest.stat().st_mtime)
                self.log(f"  {i}. {manifest.name} - {date.strftime('%Y-%m-%d %H:%M:%S')}")
        
        return {
            "database": db_backups,
            "files": file_backups,
            "manifests": manifest_files
        }
    
    def restore_from_manifest(self, manifest_path):
        """Restore from a backup manifest"""
        try:
            with open(manifest_path, "r") as f:
                manifest = json.load(f)
            
            self.log(f"Restoring from manifest: {manifest_path}")
            self.log(f"Backup date: {manifest['backup_date']}")
            
            # Restore database
            if manifest.get("database_backup"):
                self.restore_database(Path(manifest["database_backup"]))
            
            # Restore files
            if manifest.get("files_backup"):
                self.restore_uploaded_files(Path(manifest["files_backup"]))
            
            # Restore config
            if manifest.get("config_backup"):
                self.restore_config_files(Path(manifest["config_backup"]))
            
            self.log("Restore from manifest completed successfully")
            return True
            
        except Exception as e:
            self.log(f"Restore from manifest failed: {str(e)}")
            return False
    
    def restore_database(self, backup_path):
        """Restore database from backup"""
        try:
            self.log(f"Restoring database from: {backup_path}")
            
            # Create backup of current database
            if self.db_path.exists():
                backup_current = self.db_path.parent / f"family_finance_backup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
                shutil.copy2(self.db_path, backup_current)
                self.log(f"Current database backed up to: {backup_current}")
            
            # Decompress and restore
            with gzip.open(backup_path, 'rb') as f_in:
                with open(self.db_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            self.log("Database restore completed successfully")
            return True
            
        except Exception as e:
            self.log(f"Database restore failed: {str(e)}")
            return False
    
    def restore_uploaded_files(self, backup_path):
        """Restore uploaded files from backup"""
        try:
            self.log(f"Restoring uploaded files from: {backup_path}")
            
            # Create backup of current uploads
            if self.uploads_dir.exists():
                backup_current = self.uploads_dir.parent / f"uploads_backup_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}"
                shutil.move(str(self.uploads_dir), str(backup_current))
                self.log(f"Current uploads backed up to: {backup_current}")
            
            # Extract files
            temp_dir = self.backup_root / "temp_restore"
            temp_dir.mkdir(exist_ok=True)
            
            subprocess.run([
                "tar", "-xzf", str(backup_path),
                "-C", str(temp_dir)
            ], check=True)
            
            # Move extracted files to uploads directory
            extracted_dir = temp_dir / f"uploads_{backup_path.stem.replace('.tar', '')}"
            if extracted_dir.exists():
                shutil.move(str(extracted_dir), str(self.uploads_dir))
            
            # Cleanup temp directory
            shutil.rmtree(temp_dir)
            
            self.log("Uploaded files restore completed successfully")
            return True
            
        except Exception as e:
            self.log(f"Uploaded files restore failed: {str(e)}")
            return False
    
    def restore_config_files(self, backup_path):
        """Restore configuration files from backup"""
        try:
            self.log(f"Restoring configuration files from: {backup_path}")
            
            # Extract files
            temp_dir = self.backup_root / "temp_config_restore"
            temp_dir.mkdir(exist_ok=True)
            
            subprocess.run([
                "tar", "-xzf", str(backup_path),
                "-C", str(temp_dir)
            ], check=True)
            
            # Find extracted config directory
            extracted_dirs = list(temp_dir.glob("config_temp_*"))
            if extracted_dirs:
                config_dir = extracted_dirs[0]
                
                # Copy files back to project root
                for item in config_dir.rglob("*"):
                    if item.is_file():
                        relative_path = item.relative_to(config_dir)
                        target_path = self.project_root / relative_path
                        target_path.parent.mkdir(parents=True, exist_ok=True)
                        shutil.copy2(item, target_path)
            
            # Cleanup temp directory
            shutil.rmtree(temp_dir)
            
            self.log("Configuration files restore completed successfully")
            return True
            
        except Exception as e:
            self.log(f"Configuration files restore failed: {str(e)}")
            return False
    
    def interactive_restore(self):
        """Interactive restore process"""
        self.log("=" * 50)
        self.log("Family Finance Restore System")
        self.log("=" * 50)
        
        # List available backups
        backups = self.list_available_backups()
        
        if not backups["manifests"]:
            self.log("No backup manifests found. Cannot perform restore.")
            return False
        
        # Let user select backup
        try:
            choice = input(f"\nSelect backup to restore (1-{len(backups['manifests'])}): ")
            choice_idx = int(choice) - 1
            
            if 0 <= choice_idx < len(backups["manifests"]):
                selected_manifest = backups["manifests"][choice_idx]
                return self.restore_from_manifest(selected_manifest)
            else:
                self.log("Invalid selection")
                return False
                
        except (ValueError, KeyboardInterrupt):
            self.log("Restore cancelled")
            return False

if __name__ == "__main__":
    restore_system = FamilyFinanceRestore()
    restore_system.interactive_restore()
