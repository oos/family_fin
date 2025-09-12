#!/bin/bash
# Setup automated daily backup for Family Finance

# Get the project directory
PROJECT_DIR="/Users/oos/family_fin"
BACKUP_SCRIPT="$PROJECT_DIR/backups/scripts/backup_system.py"
LOG_FILE="$PROJECT_DIR/backups/logs/cron_backup.log"

# Make backup script executable
chmod +x "$BACKUP_SCRIPT"

# Create cron job entry
CRON_ENTRY="0 2 * * * cd $PROJECT_DIR && python3 $BACKUP_SCRIPT >> $LOG_FILE 2>&1"

# Add to crontab if not already present
if ! crontab -l 2>/dev/null | grep -q "backup_system.py"; then
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo "Cron job added successfully"
    echo "Backup will run daily at 2:00 AM"
else
    echo "Cron job already exists"
fi

# Show current crontab
echo "Current crontab:"
crontab -l

# Test backup script
echo "Testing backup script..."
cd "$PROJECT_DIR"
python3 "$BACKUP_SCRIPT"
