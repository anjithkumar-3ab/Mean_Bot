# Admin Telegram Bot Setup

This document explains how to set up and use the Admin Telegram Bot for the Attendance Automation System.

## Setting Up Admin Bot

1. **Create a New Bot with BotFather**:
   - Open Telegram and search for `@BotFather`
   - Send `/newbot` and follow the instructions to create a new bot
   - Name the bot something like "Attendance Admin Bot"
   - Copy the bot token provided by BotFather

2. **Configure Environment Variables**:
   - Open your `.env` file
   - Add the following lines:
   ```
   ADMIN_TELEGRAM_BOT_TOKEN=your_admin_bot_token_here
   ADMIN_TELEGRAM_CHAT_IDS=your_chat_id_here
   ADMIN_BOT_PASSWORD=your_secure_password
   ```
   - You can add multiple admin chat IDs by separating them with commas
   - Choose a secure password that admins will need to enter for authentication

3. **Get Your Chat ID**:
   - Start a conversation with your bot
   - You will see "Unauthorized" message with your chat ID
   - Add this chat ID to the `ADMIN_TELEGRAM_CHAT_IDS` in the `.env` file
   - Restart the server for changes to take effect
   
4. **Authentication Process**:
   - When an authorized chat ID tries to access the bot, they'll be prompted for the password
   - Enter the password exactly as defined in the ADMIN_BOT_PASSWORD environment variable
   - After successful authentication, admins can use all bot features

## Admin Bot Features

### System Monitoring

- View system statistics
- Check scheduler status
- Receive automated notifications about system events:
  - System startup and shutdown
  - Scheduled attendance checks
  - Error notifications
  - Manual check results

### Student Management

- View list of all students
- Search for specific students
- View detailed student information
- Activate/deactivate student accounts
- Remove students from the system

### Attendance Management

- View recent attendance records
- Run manual attendance checks
- Check attendance for specific students

### System Administration

- Start/stop the scheduler
- Add new administrators
- Configure system settings

## Admin Bot Commands

- `/start` - Show main menu and welcome message
- `/help` - Display help information and available commands
- `/stats` - Show system statistics
- `/students` - List all registered students
- `/findstudent <query>` - Search for students by ID or name
- `/check <studentId>` - Check attendance for a specific student
- `/manualcheck` - Run attendance check for all active students
- `/addadmin <chatId>` - Add a new admin by chat ID
- `/schedulerstatus` - Check scheduler status and settings

## Security

- Two-factor authentication for admin access:
  1. Chat ID must be in the authorized list (something you have)
  2. Admin password required (something you know)
- All authentication attempts are logged
- Failed password attempts are tracked and reported
- Session-based authentication ensures continued security
- Only authorized admins can access sensitive functions like student management and system configuration

## Troubleshooting

1. **Bot not responding**:
   - Verify the `ADMIN_TELEGRAM_BOT_TOKEN` is correct
   - Restart the server to reinitialize the bot

2. **Unauthorized Access**:
   - Check that your chat ID is included in `ADMIN_TELEGRAM_CHAT_IDS`
   - Make sure there are no spaces between commas in the chat IDs list

3. **Commands not working**:
   - Restart the bot by sending `/start`
   - Check server logs for any errors

## Best Practices

1. Use a different bot for admin access than for student notifications
2. Limit admin access to trusted individuals
3. Keep your `.env` file secure
4. Use the bot on a secure device
5. Monitor the bot's access logs periodically