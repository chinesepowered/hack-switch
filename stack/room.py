#!/usr/bin/env python3
"""Read and post in the CapyTales family room on the local Mattermost.

  python3 stack/room.py read [--last N]            show the latest messages
  python3 stack/room.py post --as mia "message"    post as a family member
  python3 stack/room.py wait --from capy-mochi [--after POST_ID] [--files] [--timeout 600]
                                                   wait until that capybara posts (with files)
  python3 stack/room.py download POST_ID DIR       save a post's attachments

Accounts and passwords come from stack/.env (written by up.sh and family.sh).
"""
import argparse
import json
import os
import sys
import time
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
MM = os.environ.get("MM_URL", "http://127.0.0.1:8065")
ROOM = os.environ.get("CAPY_ROOM", "capy-bedtime")


def env():
    vals = {}
    with open(os.path.join(HERE, ".env")) as f:
        for line in f:
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.rstrip("\n").split("=", 1)
                vals[k.strip()] = v.strip()
    return vals


E = env()
ACCOUNTS = {
    "admin": (E["MATTERMOST_ADMIN_USER"], E["MATTERMOST_ADMIN_PASSWORD"]),
    "sam": (E["MATTERMOST_USER"], E["MATTERMOST_USER_PASSWORD"]),
    "parent": (E["MATTERMOST_USER"], E["MATTERMOST_USER_PASSWORD"]),
    "mia": ("mia", E.get("MIA_PASSWORD", "")),
    "nana": ("nana", E.get("NANA_PASSWORD", "")),
}
_tokens = {}


def call(method, path, body=None, who="sam", raw=False):
    token = login(who) if path != "/api/v4/users/login" else None
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(MM + path, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=60) as res:
        payload = res.read()
        if path == "/api/v4/users/login":
            return res.headers["Token"]
        return payload if raw else json.loads(payload or b"null")


def login(who):
    if who not in _tokens:
        user, pw = ACCOUNTS[who]
        _tokens[who] = call("POST", "/api/v4/users/login", {"login_id": user, "password": pw}, who=who)
    return _tokens[who]


def room_id(who="sam"):
    me = call("GET", "/api/v4/users/me", who=who)
    team = call("GET", f"/api/v4/teams/name/{E['MATTERMOST_TEAM_NAME']}", who=who)
    for ch in call("GET", f"/api/v4/users/{me['id']}/teams/{team['id']}/channels", who=who):
        if ch["display_name"] == ROOM or ch["name"] == ROOM:
            return ch["id"]
    sys.exit(f"{who} is not in a room called {ROOM}")


_names = {}


def name_of(user_id):
    if user_id not in _names:
        u = call("GET", f"/api/v4/users/{user_id}")
        _names[user_id] = u.get("username") or user_id
    return _names[user_id]


def posts(cid, who="sam"):
    data = call("GET", f"/api/v4/channels/{cid}/posts?per_page=200", who=who)
    items = [data["posts"][pid] for pid in data["order"]]
    return sorted(items, key=lambda p: p["create_at"])


def show(p):
    files = [f["name"] for f in p.get("metadata", {}).get("files", [])]
    when = time.strftime("%H:%M:%S", time.localtime(p["create_at"] / 1000))
    who = p.get("props", {}).get("override_username") or name_of(p["user_id"])
    text = p["message"].strip()
    print(f"[{when}] {who} ({p['id'][:8]}): {text}" + (f"\n    files: {', '.join(files)}" if files else ""))


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("read")
    r.add_argument("--last", type=int, default=20)
    p = sub.add_parser("post")
    p.add_argument("--as", dest="who", default="sam")
    p.add_argument("message")
    w = sub.add_parser("wait")
    w.add_argument("--from", dest="sender", required=True)
    w.add_argument("--after", default=None)
    w.add_argument("--files", action="store_true")
    w.add_argument("--contains", default=None)
    w.add_argument("--timeout", type=int, default=600)
    d = sub.add_parser("download")
    d.add_argument("post_id")
    d.add_argument("dir")
    a = ap.parse_args()

    cid = room_id()
    if a.cmd == "read":
        for item in posts(cid)[-a.last:]:
            show(item)
    elif a.cmd == "post":
        if a.who != "sam":
            room_id(a.who)  # the sender must be in the room
        made = call("POST", "/api/v4/posts", {"channel_id": cid, "message": a.message}, who=a.who)
        print(made["id"])
    elif a.cmd == "wait":
        start = time.time()
        after_ts = 0
        if a.after:
            after_ts = call("GET", f"/api/v4/posts/{a.after}")["create_at"]
        while time.time() - start < a.timeout:
            for item in posts(cid):
                sender = item.get("props", {}).get("override_username") or name_of(item["user_id"])
                if item["create_at"] <= after_ts or a.sender not in sender:
                    continue
                if a.files and not item.get("metadata", {}).get("files"):
                    continue
                if a.contains and a.contains.lower() not in item["message"].lower():
                    continue
                show(item)
                return
            time.sleep(4)
        sys.exit(f"timed out after {a.timeout}s waiting for {a.sender}")
    elif a.cmd == "download":
        os.makedirs(a.dir, exist_ok=True)
        item = call("GET", f"/api/v4/posts/{a.post_id}")
        for f in item.get("metadata", {}).get("files", []):
            blob = call("GET", f"/api/v4/files/{f['id']}", raw=True)
            with open(os.path.join(a.dir, f["name"]), "wb") as out:
                out.write(blob)
            print(os.path.join(a.dir, f["name"]))


if __name__ == "__main__":
    main()
