#!/usr/bin/env python3
"""
Family Finance Backup System
Automated backup for database and uploaded files
"""

import os
import shutil
import sqlite3
import datetime
import gzip
import json
import subprocess
from pathlib import Path

class FamilyFinanceBackup:
    def __init__(self, project_root="/Users/oos/family_fin"):
        self.project_root = Path(project_root)
        self.backup_root = self.project_root / "backups"
        self.db_path = self.project_root / "instance" / "family_finance.db"
        self.uploads_dir = self.project_root / "uploads"
        self.timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Create backup directories
        self.db_backup_dir = self.backup_root / "database"
        self.files_backup_dir = self.backup_root / "files"
        self.logs_dir = self.backup_root / "logs"
        
        for dir_path in [self.db_backup_dir, self.files_backup_dir, self.logs_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def log(self, message):
        """Log message with timestamp"""
        timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        print(log_message)
        
        # Write to log file
        log_file = self.logs_dir / f"backup_{datetime.datetime.now().strftime('%Y%m%d')}.log"
        with open(log_file, "a") as f:
            f.write(log_message + "\n")
    
    def backup_database(self):
        """Backup SQLite database with compression"""
        try:
            self.log("Starting database backup...")
            
            # Create backup filename with timestamp
            backup_filename = f"family_finance_{self.timestamp}.db"
            backup_path = self.db_backup_dir / backup_filename
            
            # Copy database file
            shutil.copy2(self.db_path, backup_path)
            
            # Compress the backup
            compressed_path = f"{backup_path}.gz"
            with open(backup_path, 'rb') as f_in:
                with gzip.open(compressed_path, 'wb') as f_out:
                    shutil.copyfileobj(f_in, f_out)
            
            # Remove uncompressed file
            os.remove(backup_path)
            
            # Get file size
            file_size = os.path.getsize(compressed_path)
            self.log(f"Database backup completed: {compressed_path} ({file_size:,} bytes)")
            
            return compressed_path
            
        except Exception as e:
            self.log(f"Database backup failed: {str(e)}")
            return None
    
    def backup_uploaded_files(self):
        """Backup uploaded files"""
        try:
            self.log("Starting uploaded files backup...")
            
            if not self.uploads_dir.exists():
                self.log("No uploads directory found, creating empty backup")
                return None
            
            # Create backup directory for this timestamp
            files_backup_path = self.files_backup_dir / f"uploads_{self.timestamp}"
            files_backup_path.mkdir(exist_ok=True)
            
            # Copy all files recursively
            shutil.copytree(self.uploads_dir, files_backup_path, dirs_exist_ok=True)
            
            # Create compressed archive
            archive_path = self.files_backup_dir / f"uploads_{self.timestamp}.tar.gz"
            subprocess.run([
                "tar", "-czf", str(archive_path), 
                "-C", str(self.files_backup_dir), 
                f"uploads_{self.timestamp}"
            ], check=True)
            
            # Remove uncompressed directory
            shutil.rmtree(files_backup_path)
            
            # Get file size
            file_size = os.path.getsize(archive_path)
            self.log(f"Uploaded files backup completed: {archive_path} ({file_size:,} bytes)")
            
            return archive_path
            
        except Exception as e:
            self.log(f"Uploaded files backup failed: {str(e)}")
            return None
    
    def backup_config_files(self):
        """Backup important configuration files"""
        try:
            self.log("Starting configuration files backup...")
            
            config_backup_path = self.files_backup_dir / f"config_{self.timestamp}.tar.gz"
            
            # List of important files to backup
            important_files = [
                "app.py",
                "models.py", 
                "requirements.txt",
                "seed_data.py",
                "migrations/",
                "netlify.toml",
                "package.json",
                "package-lock.json"
            ]
            
            # Create temporary directory for config files
            temp_config_dir = self.files_backup_dir / f"config_temp_{self.timestamp}"
            temp_config_dir.mkdir(exist_ok=True)
            
            # Copy important files
            for file_path in important_files:
                src_path = self.project_root / file_path
                if src_path.exists():
                    if src_path.is_dir():
                        shutil.copytree(src_path, temp_config_dir / file_path)
                    else:
                        shutil.copy2(src_path, temp_config_dir / file_path)
            
            # Create compressed archive
            subprocess.run([
                "tar", "-czf", str(config_backup_path),
                "-C", str(self.files_backup_dir),
                f"config_temp_{self.timestamp}"
            ], check=True)
            
            # Remove temporary directory
            shutil.rmtree(temp_config_dir)
            
            # Get file size
            file_size = os.path.getsize(config_backup_path)
            self.log(f"Configuration files backup completed: {config_backup_path} ({file_size:,} bytes)")
            
            return config_backup_path
            
        except Exception as e:
            self.log(f"Configuration files backup failed: {str(e)}")
            return None
    
    def create_backup_manifest(self, db_backup, files_backup, config_backup):
        """Create a manifest file with backup information"""
        try:
            manifest = {
                "timestamp": self.timestamp,
                "backup_date": datetime.datetime.now().isoformat(),
                "database_backup": str(db_backup) if db_backup else None,
                "files_backup": str(files_backup) if files_backup else None,
                "config_backup": str(config_backup) if config_backup else None,
                "project_root": str(self.project_root),
                "backup_version": "1.0.0"
            }
            
            manifest_path = self.backup_root / f"backup_manifest_{self.timestamp}.json"
            with open(manifest_path, "w") as f:
                json.dump(manifest, f, indent=2)
            
            self.log(f"Backup manifest created: {manifest_path}")
            return manifest_path
            
        except Exception as e:
            self.log(f"Failed to create backup manifest: {str(e)}")
            return None
    
    def cleanup_old_backups(self, keep_days=30):
        """Remove backups older than specified days"""
        try:
            self.log(f"Cleaning up backups older than {keep_days} days...")
            
            cutoff_date = datetime.datetime.now() - datetime.timedelta(days=keep_days)
            removed_count = 0
            
            # Clean up database backups
            for file_path in self.db_backup_dir.glob("*.db.gz"):
                if datetime.datetime.fromtimestamp(file_path.stat().st_mtime) < cutoff_date:
                    file_path.unlink()
                    removed_count += 1
            
            # Clean up file backups
            for file_path in self.files_backup_dir.glob("*.tar.gz"):
                if datetime.datetime.fromtimestamp(file_path.stat().st_mtime) < cutoff_date:
                    file_path.unlink()
                    removed_count += 1
            
            # Clean up manifest files
            for file_path in self.backup_root.glob("backup_manifest_*.json"):
                if datetime.datetime.fromtimestamp(file_path.stat().st_mtime) < cutoff_date:
                    file_path.unlink()
                    removed_count += 1
            
            self.log(f"Cleanup completed: removed {removed_count} old backup files")
            
        except Exception as e:
            self.log(f"Cleanup failed: {str(e)}")
    
    def run_full_backup(self):
        """Run complete backup process"""
        self.log("=" * 50)
        self.log("Starting Family Finance Full Backup")
        self.log("=" * 50)
        
        # Backup database
        db_backup = self.backup_database()
        
        # Backup uploaded files
        files_backup = self.backup_uploaded_files()
        
        # Backup configuration files
        config_backup = self.backup_config_files()
        
        # Create manifest
        manifest = self.create_backup_manifest(db_backup, files_backup, config_backup)
        
        # Cleanup old backups
        self.cleanup_old_backups()
        
        self.log("=" * 50)
        self.log("Backup process completed")
        self.log("=" * 50)
        
        return {
            "database": db_backup,
            "files": files_backup,
            "config": config_backup,
            "manifest": manifest
        }

if __name__ == "__main__":
    backup_system = FamilyFinanceBackup()
    backup_system.run_full_backup()
