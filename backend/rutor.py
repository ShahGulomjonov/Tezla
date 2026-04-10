"""
Rutor.info scraper — O'zbekistonda ishlaydigan torrent qidiruv moduli.
Film nomiga qarab magnet havolalarini topadi.
"""
import re
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional

RUTOR_SEARCH_URL = "https://rutor.info/search/0/0/010/0/{query}"
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}


def search_rutor(query: str) -> List[Dict]:
    """
    Search Rutor.info for torrents matching the query.
    Returns a list of dicts with: title, magnet, size, seeds.
    """
    try:
        url = RUTOR_SEARCH_URL.format(query=requests.utils.quote(query))
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()

        soup = BeautifulSoup(resp.text, "lxml")
        results = []

        # Rutor's results are in #index table rows
        table = soup.select_one("#index")
        if not table:
            return []

        rows = table.find_all("tr")
        for row in rows:
            cells = row.find_all("td")
            if len(cells) < 2:
                continue

            # Find magnet link
            magnet_tag = row.find("a", href=re.compile(r"^magnet:\?"))
            if not magnet_tag:
                continue
            magnet = magnet_tag["href"]

            # Find title — the last <a> with /torrent/ path in the second cell
            title_tag = None
            for a in cells[1].find_all("a"):
                href = a.get("href", "")
                if "/torrent/" in href:
                    title_tag = a
            
            title = title_tag.get_text(strip=True) if title_tag else "Unknown"

            # Size is usually in the 3rd cell (index 2)
            size = cells[2].get_text(strip=True) if len(cells) > 2 else ""

            # Seeds/Peers in the last cell
            seeds = ""
            if len(cells) > 3:
                seed_spans = cells[-1].find_all("span")
                if seed_spans:
                    seeds = seed_spans[0].get_text(strip=True)

            results.append({
                "title": title,
                "magnet": magnet,
                "size": size,
                "seeds": seeds,
            })

        return results

    except Exception as e:
        print(f"Rutor search error: {e}")
        return []


def find_best_movie_torrent(title: str, year: Optional[int] = None) -> Optional[Dict]:
    """
    Search for the best 1080p/720p torrent for a movie on Rutor.
    Prioritizes: 1080p > 720p, higher seeds.
    """
    query = title
    if year:
        query = f"{title} {year}"

    results = search_rutor(query)
    if not results:
        return None

    # Filter by video quality keywords
    def score(item):
        t = item["title"].lower()
        s = 0
        if "1080p" in t or "1080" in t:
            s += 100
        elif "720p" in t or "720" in t:
            s += 50
        elif "2160p" in t or "4k" in t:
            s += 30  # too large for processing
        if "bdrip" in t or "bluray" in t or "blu-ray" in t:
            s += 20
        if "webrip" in t or "web-dl" in t:
            s += 15
        # Prefer smaller files for faster download
        size_text = item["size"].lower()
        if "gb" in size_text:
            try:
                gb = float(re.search(r"([\d.]+)", size_text).group(1))
                if gb < 3:
                    s += 10
                elif gb > 10:
                    s -= 20
            except:
                pass
        # Seeds boost
        try:
            seed_count = int(item["seeds"])
            s += min(seed_count, 50)
        except:
            pass
        return s

    results.sort(key=score, reverse=True)
    return results[0] if results else None
