import secrets
secret_key = secrets.token_hex(16)

# JIRA API Configuration
JIRA_SERVER = ""
JIRA_EMAIL = ""
JIRA_API_TOKEN = ""

# Flask Configuration
# Generate this using secrets.token_hex(16) or os.urandom(24).hex()
SECRET_KEY = secret_key