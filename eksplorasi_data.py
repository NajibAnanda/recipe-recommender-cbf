"""
Tahap 1: Eksplorasi Data Awal (EDA) & Preprocessing
-----------------------------------------------------
File ini dijalankan SEKALI untuk:
1. Memeriksa kondisi dataset mentah (missing value, duplikat, distribusi)
2. Membersihkan data (lewat fungsi di recipe_recommender.py)
3. Menyimpan hasil data bersih ke 'dataset_bersih.csv'

Hasil file ini dipakai sebagai bukti/lampiran bagian "Preprocessing Data"
di draft paper, dan dataset_bersih.csv dipakai oleh evaluasi.py & app.py
agar tidak perlu membersihkan data berulang-ulang.

Jalankan dengan: python eksplorasi_data.py
"""

import pandas as pd
from recipe_recommender import load_data, preprocess_dataframe

DATASET_PATH = "dataset.csv"
OUTPUT_PATH = "dataset_bersih.csv"


def main():
    print("=" * 60)
    print("TAHAP 1: EKSPLORASI DATA AWAL (EDA)")
    print("=" * 60)

    # --- 1. Load data mentah ---
    df_raw = load_data(DATASET_PATH)
    print(f"\nJumlah baris awal       : {len(df_raw)}")
    print(f"Kolom                   : {list(df_raw.columns)}")

    # --- 2. Cek missing value ---
    print("\n--- Missing value per kolom ---")
    print(df_raw.isna().sum())

    # --- 3. Cek duplikat ---
    jumlah_duplikat = df_raw.duplicated(subset=["title", "ingredients"]).sum()
    print(f"\nJumlah baris duplikat (title+ingredients) : {jumlah_duplikat}")

    # --- 4. Distribusi sourcefile (kategori protein) ---
    if "sourcefile" in df_raw.columns:
        print("\n--- Distribusi sourcefile ---")
        print(df_raw["sourcefile"].value_counts())

    # --- 5. Statistik kolom loves (popularitas) ---
    if "loves" in df_raw.columns:
        print("\n--- Statistik kolom 'loves' ---")
        print(pd.to_numeric(df_raw["loves"], errors="coerce").describe())

    # --- 6. Contoh data sebelum dibersihkan ---
    print("\n--- Contoh 3 data SEBELUM dibersihkan ---")
    print(df_raw[["title", "ingredients"]].head(3).to_string())

    # --- 7. Jalankan preprocessing ---
    print("\n" + "=" * 60)
    print("PROSES PEMBERSIHAN DATA")
    print("=" * 60)
    df_clean = preprocess_dataframe(df_raw, language="id")

    print(f"\nJumlah baris setelah dibersihkan : {len(df_clean)}")
    print(f"Baris yang terbuang               : {len(df_raw) - len(df_clean)}")

    print("\n--- Contoh 3 data SETELAH dibersihkan ---")
    print(df_clean[["title", "ingredients", "clean_ingredients"]].head(3).to_string())

    # --- 8. Simpan hasil bersih ---
    df_clean.to_csv(OUTPUT_PATH, index=False)
    print(f"\nData bersih disimpan ke: {OUTPUT_PATH}")
    print("Selesai. Lanjutkan ke evaluasi.py atau app.py")


if __name__ == "__main__":
    main()