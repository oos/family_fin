# Family Finance Backup System

This directory contains a comprehensive backup system for the Family Finance application, including database, uploaded files, and configuration files.

## Directory Structure

```
backups/
├── database/          # SQLite database backups (compressed)
├── files/            # Uploaded files and configuration backups
├── logs/             # Backup operation logs
└── scripts/          # Backup and restore scripts
    ├── backup_system.py      # Main backup script
    ├── restore_system.py     # Restore script
    ├── backup_status.py      # Status checker
    └── setup_cron_backup.sh  # Cron job setup
```

## Features

### Automated Backups
- **Database Backup**: Compressed SQLite database snapshots
- **File Backup**: All uploaded documents and files
- **Config Backup**: Application configuration and source files
- **Manifest Files**: JSON files tracking backup metadata
- **Automatic Cleanup**: Removes backups older than 30 days

### Backup Types
1. **Full Backup**: Complete system backup (database + files + config)
2. **Database Only**: Just the SQLite database
3. **Files Only**: Just uploaded files
4. **Config Only**: Just configuration files

## Usage

### Manual Backup
```bash
# Run full backup
cd /Users/oos/family_fin
python3 backups/scripts/backup_system.py

# Check backup status
python3 backups/scripts/backup_status.py
```

### Automated Daily Backups
```bash
# Setup daily backups at 2:00 AM
chmod +x backups/scripts/setup_cron_backup.sh
./backups/scripts/setup_cron_backup.sh
```

### Restore from Backup
```bash
# Interactive restore
python3 backups/scripts/restore_system.py

# Restore specific backup
python3 backups/scripts/restore_system.py --manifest backup_manifest_20241212_140000.json
```

## Backup Schedule

- **Daily**: Full system backup at 2:00 AM
- **Retention**: 30 days (configurable)
- **Compression**: All backups are compressed to save space
- **Logging**: All operations are logged with timestamps

## File Naming Convention

- **Database**: `family_finance_YYYYMMDD_HHMMSS.db.gz`
- **Files**: `uploads_YYYYMMDD_HHMMSS.tar.gz`
- **Config**: `config_YYYYMMDD_HHMMSS.tar.gz`
- **Manifest**: `backup_manifest_YYYYMMDD_HHMMSS.json`

## Disaster Recovery

### Quick Restore
1. Stop the application
2. Run restore script: `python3 backups/scripts/restore_system.py`
3. Select the most recent backup
4. Restart the application

### Manual Restore
1. **Database**: Extract `.db.gz` file to `instance/family_finance.db`
2. **Files**: Extract `.tar.gz` file to `uploads/` directory
3. **Config**: Extract config `.tar.gz` to project root

## Monitoring

### Check Backup Status
```bash
python3 backups/scripts/backup_status.py
```

### View Backup Logs
```bash
tail -f backups/logs/backup_*.log
```

### Disk Usage
```bash
du -sh backups/
```

## Configuration

### Backup Retention
Edit `backup_system.py` and modify the `cleanup_old_backups()` call:
```python
# Keep backups for 60 days instead of 30
self.cleanup_old_backups(keep_days=60)
```

### Backup Schedule
Edit `setup_cron_backup.sh` and modify the cron expression:
```bash
# Run backup every 6 hours instead of daily
CRON_ENTRY="0 */6 * * * cd $PROJECT_DIR && python3 $BACKUP_SCRIPT >> $LOG_FILE 2>&1"
```

## Troubleshooting

### Backup Fails
1. Check disk space: `df -h`
2. Check permissions: `ls -la backups/`
3. Check logs: `tail backups/logs/backup_*.log`

### Restore Fails
1. Verify backup files exist
2. Check file permissions
3. Ensure sufficient disk space
4. Check restore logs

### Cron Job Not Running
1. Check cron service: `sudo systemctl status cron`
2. Check crontab: `crontab -l`
3. Check logs: `tail /var/log/cron`

## Security Considerations

- Backup files contain sensitive financial data
- Ensure proper file permissions (600 for database, 644 for others)
- Consider encrypting backups for additional security
- Store backups in secure, off-site locations

## Maintenance

### Weekly Tasks
- Check backup status
- Verify disk space
- Review backup logs

### Monthly Tasks
- Test restore process
- Review backup retention policy
- Update backup scripts if needed

## Support

For issues with the backup system:
1. Check the logs in `backups/logs/`
2. Run the status checker: `python3 backups/scripts/backup_status.py`
3. Verify file permissions and disk space
4. Test with a manual backup first
