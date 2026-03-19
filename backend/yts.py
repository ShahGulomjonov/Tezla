import requests
import json
import os
import subprocess
import asyncio
from typing import List, Dict

YTS_API_URL = "https://yts.mx/api/v2/list_movies.json"

def search_movies(query: str) -> List[Dict]:
    """Search for movies on YTS."""
    try:
        response = requests.get(YTS_API_URL, params={"query_term": query, "limit": 10})
        response.raise_for_status()
        data = response.json()
        
        movies = []
        if data.get("status") == "ok" and data.get("data", {}).get("movies"):
            for m in data["data"]["movies"]:
                movies.append({
                    "id": m["id"],
                    "title": m["title"],
                    "year": m["year"],
                    "rating": m["rating"],
                    "runtime": m["runtime"],
                    "genres": m.get("genres", []),
                    "summary": m.get("summary", ""),
                    "poster": m.get("medium_cover_image", ""),
                    "torrents": m.get("torrents", [])
                })
        return movies
    except Exception as e:
        print(f"YTS Search Error: {e}")
        return []

async def download_torrent(torrent_url: str, dest_dir: str):
    """
    Downloads the torrent safely using webtorrent-cli into the destination directory.
    Assumes `webtorrent-cli` is installed via `npm install -g webtorrent-cli`.
    """
    try:
        os.makedirs(dest_dir, exist_ok=True)
        # Using webtorrent to download to the dest_dir
        # webtorrent download <url> --out <dir>
        process = await asyncio.create_subprocess_exec(
            "webtorrent",
            "download",
            torrent_url,
            "--out",
            dest_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE
        )
        
        stdout, stderr = await process.communicate()
        
        if process.returncode != 0:
            raise Exception(f"Torrent download failed: {stderr.decode()}")
            
        print(f"Torrent downloaded to {dest_dir}")
        return True
    except Exception as e:
        print(f"Torrent Execution Error: {e}")
        raise e
