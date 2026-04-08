import sqlite3
import os
import sys

def convert():
    if len(sys.argv) != 2:
        print("Cách dùng: python convert.py ten_file.mbtiles")
        return

    mbtiles_file = sys.argv[1]
    if not os.path.exists(mbtiles_file):
        print(f"Không tìm thấy file: {mbtiles_file}")
        return

    # Tạo thư mục đầu ra dựa trên tên file
    out_dir = "baothuan_tiles"
    if not os.path.exists(out_dir):
        os.makedirs(out_dir)

    conn = sqlite3.connect(mbtiles_file)
    cursor = conn.cursor()
    cursor.execute("SELECT zoom_level, tile_column, tile_row, tile_data FROM tiles")

    print(f"Đang bắt đầu giải nén file {mbtiles_file}...")

    count = 0
    for row in cursor:
        z = row[0]
        x = row[1]
        y = row[2]
        tile_data = row[3]

        # Chuyển đổi tọa độ Y từ hệ TMS sang chuẩn Google/Leaflet
        y = (2**z - 1) - y

        # Tạo cấu trúc thư mục z/x
        tile_dir = os.path.join(out_dir, str(z), str(x))
        if not os.path.exists(tile_dir):
            os.makedirs(tile_dir)

        # Lưu file ảnh
        tile_path = os.path.join(tile_dir, f"{y}.jpg")
        with open(tile_path, 'wb') as f:
            f.write(tile_data)
        
        count += 1
        if count % 1000 == 0:
            print(f"Đã xử lý {count} mảnh ảnh...")

    print(f"Xong! Đã giải nén thành công {count} ảnh vào thư mục '{out_dir}'.")
    conn.close()

if __name__ == "__main__":
    convert()