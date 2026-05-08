import asyncio
import httpx
from datetime import datetime
from app.database import get_db

async def ping_production_urls():
    """
    Background worker that pings all repos with a production_url.
    Checks for 200 OK and records the status.
    """
    while True:
        try:
            with get_db() as db:
                repos = db.execute("SELECT id, production_url FROM repos WHERE production_url IS NOT NULL").fetchall()
            
            if not repos:
                await asyncio.sleep(60)
                continue

            async with httpx.AsyncClient(timeout=10.0) as client:
                for repo in repos:
                    repo_id = repo["id"]
                    url = repo["production_url"]
                    
                    status = "down"
                    try:
                        res = await client.get(url)
                        if res.status_code < 400:
                            status = "up"
                    except Exception:
                        status = "down"
                    
                    with get_db() as db:
                        db.execute(
                            "UPDATE repos SET last_uptime_status = ? WHERE id = ?",
                            (f"{status}:{datetime.utcnow().isoformat()}", repo_id)
                        )
                        
        except Exception as e:
            print(f"Uptime worker error: {e}")
            
        # Ping every 5 minutes
        await asyncio.sleep(300)

def start_uptime_worker():
    asyncio.ensure_future(ping_production_urls())
