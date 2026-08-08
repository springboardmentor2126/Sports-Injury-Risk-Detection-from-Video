import sqlite3
import os

print('DB exists:', os.path.exists('sports_injury.db'))
if os.path.exists('sports_injury.db'):
    conn = sqlite3.connect('sports_injury.db')
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    print('Tables:', [r[0] for r in cursor.fetchall()])

    cursor.execute('PRAGMA table_info(video_analyses)')
    columns = [info[1] for info in cursor.fetchall()]
    print('Columns in video_analyses:', columns)

    if 'ai_recommendations' not in columns:
        print('Error: ai_recommendations is MISSING from SQLite database!')
    else:
        print('ai_recommendations is present in SQLite database.')
