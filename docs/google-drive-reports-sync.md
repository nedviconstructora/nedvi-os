# Reportes de Google Drive - NEDVI OS

Scope: read-only Google Drive integration for active internal NEDVI staff. Clients are excluded.
Original documents are retained on Drive; Supabase stores only document metadata.

## Setup required before live synchronization
1. In Google Cloud, enable Google Drive API and create a dedicated service account.
2. Share the REPORTES folder with the service account email with Viewer permission. Ensure the account has inherited access to its subfolders.
3. In Vercel project nedvi-os add server-only environment variables GOOGLE_DRIVE_CLIENT_EMAIL and GOOGLE_DRIVE_PRIVATE_KEY (entire JSON private_key, escaping newlines is supported). Never use NEXT_PUBLIC_ for these secrets.
4. Trigger a new production deployment. The first authorized view refreshes the Drive index when it is older than 10 minutes, and Gerencia/DEVELOPER can manually refresh it.
5. Check that the report index and the Google Drive originals match before deciding to remove broad link-sharing permissions.

Current source folder: https://drive.google.com/drive/folders/1_1qjMhRyrhMIX7_U_LtjOcMVgvlEGxMA

Security: authenticated Supabase profile must be active, not deleted, and not a customer; RLS grants staff read-only access. No app endpoint writes to Google Drive. The service account uses only drive.metadata.readonly; users open files with Google Drive's own file access policy. Folder is currently shared to anyone with the link, which should be reviewed.
