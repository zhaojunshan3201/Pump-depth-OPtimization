# Windows Batch Management

Run these commands from the project root.

```powershell
.\start.bat
```

Starts the Node.js server in the background, writes the process id to `.server.pid`,
and writes logs to `server.out.log` and `server.err.log`.

```powershell
.\stop.bat
```

Stops the process recorded in `.server.pid` and removes the PID file.

Default URL:

```text
http://localhost:3000
```
