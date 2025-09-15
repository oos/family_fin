#!/usr/bin/env python3
"""
Family Finance Backup Status Checker
Check backup status and disk usage
"""

import os
import json
from pathlib import Path
from datetime import datetime, timedelta

class BackupStatusChecker:
    def __init__(self, project_root="/Users/oos/family_fin"):
        self.project_root = Path(project_root)
        self.backup_root = self.project_root / "backups"
    
    def get_disk_usage(self, path):
        """Get disk usage for a directory"""
        total_size = 0
        file_count = 0
        
        for file_path in path.rglob("*"):
            if file_path.is_file():
                total_size += file_path.stat().st_size
                file_count += 1
        
        return total_size, file_count
    
    def format_size(self, size_bytes):
        """Format size in human readable format"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size_bytes < 1024.0:
                return f"{size_bytes:.1f} {unit}"
            size_bytes /= 1024.0
        return f"{size_bytes:.1f} TB"
    
    def check_backup_status(self):
        """Check backup status and display summary"""
        print("=" * 60)
        print("Family Finance Backup Status")
        print("=" * 60)
        
        # Check if backup directories exist
        db_backup_dir = self.backup_root / "database"
        files_backup_dir = self.backup_root / "files"
        logs_dir = self.backup_root / "logs"
        
        print(f"Backup Root: {self.backup_root}")
        print(f"Database Backups: {db_backup_dir.exists()}")
        print(f"File Backups: {files_backup_dir.exists()}")
        print(f"Logs Directory: {logs_dir.exists()}")
        print()
        
        # Check database backups
        if db_backup_dir.exists():
            db_backups = list(db_backup_dir.glob("*.db.gz"))
            if db_backups:
                latest_db = max(db_backups, key=os.path.getmtime)
                latest_db_date = datetime.fromtimestamp(latest_db.stat().st_mtime)
                db_size, db_count = self.get_disk_usage(db_backup_dir)
                
                print(f"Database Backups:")
                print(f"  Count: {len(db_backups)}")
                print(f"  Latest: {latest_db.name} ({latest_db_date.strftime('%Y-%m-%d %H:%M:%S')})")
                print(f"  Total Size: {self.format_size(db_size)}")
                print(f"  Age: {(datetime.now() - latest_db_date).days} days")
            else:
                print("Database Backups: None found")
        else:
            print("Database Backups: Directory not found")
        
        print()
        
        # Check file backups
        if files_backup_dir.exists():
            file_backups = list(files_backup_dir.glob("*.tar.gz"))
            if file_backups:
                latest_files = max(file_backups, key=os.path.getmtime)
                latest_files_date = datetime.fromtimestamp(latest_files.stat().st_mtime)
                files_size, files_count = self.get_disk_usage(files_backup_dir)
                
                print(f"File Backups:")
                print(f"  Count: {len(file_backups)}")
                print(f"  Latest: {latest_files.name} ({latest_files_date.strftime('%Y-%m-%d %H:%M:%S')})")
                print(f"  Total Size: {self.format_size(files_size)}")
                print(f"  Age: {(datetime.now() - latest_files_date).days} days")
            else:
                print("File Backups: None found")
        else:
            print("File Backups: Directory not found")
        
        print()
        
        # Check manifest files
        manifest_files = list(self.backup_root.glob("backup_manifest_*.json"))
        if manifest_files:
            latest_manifest = max(manifest_files, key=os.path.getmtime)
            latest_manifest_date = datetime.fromtimestamp(latest_manifest.stat().st_mtime)
            
            print(f"Backup Manifests:")
            print(f"  Count: {len(manifest_files)}")
            print(f"  Latest: {latest_manifest.name} ({latest_manifest_date.strftime('%Y-%m-%d %H:%M:%S')})")
            
            # Load and display manifest info
            try:
                with open(latest_manifest, 'r') as f:
                    manifest = json.load(f)
                print(f"  Backup Date: {manifest.get('backup_date', 'Unknown')}")
                print(f"  Database: {manifest.get('database_backup', 'None')}")
                print(f"  Files: {manifest.get('files_backup', 'None')}")
                print(f"  Config: {manifest.get('config_backup', 'None')}")
            except Exception as e:
                print(f"  Error reading manifest: {e}")
        else:
            print("Backup Manifests: None found")
        
        print()
        
        # Check logs
        if logs_dir.exists():
            log_files = list(logs_dir.glob("*.log"))
            if log_files:
                latest_log = max(log_files, key=os.path.getmtime)
                latest_log_date = datetime.fromtimestamp(latest_log.stat().st_mtime)
                logs_size, logs_count = self.get_disk_usage(logs_dir)
                
                print(f"Log Files:")
                print(f"  Count: {len(log_files)}")
                print(f"  Latest: {latest_log.name} ({latest_log_date.strftime('%Y-%m-%d %H:%M:%S')})")
                print(f"  Total Size: {self.format_size(logs_size)}")
            else:
                print("Log Files: None found")
        else:
            print("Log Files: Directory not found")
        
        print()
        
        # Overall backup health
        print("Backup Health:")
        if db_backups and file_backups and manifest_files:
            latest_backup = max(
                max(db_backups, key=os.path.getmtime) if db_backups else None,
                max(file_backups, key=os.path.getmtime) if file_backups else None,
                key=lambda x: x.stat().st_mtime if x else 0
            )
            
            if latest_backup:
                backup_age = (datetime.now() - datetime.fromtimestamp(latest_backup.stat().st_mtime)).days
                if backup_age <= 1:
                    print("  Status: ✅ Healthy (backup within 24 hours)")
                elif backup_age <= 7:
                    print(f"  Status: ⚠️  Warning (backup {backup_age} days old)")
                else:
                    print(f"  Status: ❌ Critical (backup {backup_age} days old)")
            else:
                print("  Status: ❌ No backups found")
        else:
            print("  Status: ❌ Incomplete backup system")
        
        print("=" * 60)

if __name__ == "__main__":
    checker = BackupStatusChecker()
    checker.check_backup_status()
