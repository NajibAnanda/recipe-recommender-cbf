"""
Tahap 3: Evaluasi Sistem Rekomendasi
---------------------------------------
Karena dataset ini tidak memiliki rating per pengguna (bukan data
collaborative filtering), evaluasi dilakukan dengan pendekatan:

1. Evaluasi kualitatif manual  : cek relevansi top-N hasil dari beberapa
                                contoh query bahan secara langsung.
2. Rata-rata similarity score  : seberapa "mirip" rata-rata hasil top-N
                                terhadap query (semakin tinggi semakin baik).
3. Diversity                   : seberapa beragam kategori (sourcefile)
                                pada hasil rekomendasi.

Hasil dari file ini yang ditulis di bagian "Hasil dan Pembahasan" paper.

Jalankan dengan: python evaluasi.py
"""

import pandas as pd
from recipe_recommender import build_tfidf, recommend_by_ingredients

DATASET_BERSIH_PATH = "dataset_bersih.csv"

# Daftar query uji coba -- silakan tambah/ubah sesuai kebutuhan
QUERY_UJI = [
    "ayam bawang putih cabai",
    "tahu tempe kecap",
    "udang bawang merah",
    "telur kentang",
    "ikan kemangi",
]

TOP_N = 5
LOVE_WEIGHT = 0.2


def evaluasi_similarity_rata_rata(df, vectorizer, tfidf_matrix):
    """Menghitung rata-rata similarity score dari top-N tiap query uji."""
    semua_skor = []
    print("\n" + "=" * 60)
    print("EVALUASI: RATA-RATA SIMILARITY SCORE PER QUERY")
    print("=" * 60)

    for query in QUERY_UJI:
        hasil = recommend_by_ingredients(
            query, df, vectorizer, tfidf_matrix,
            top_n=TOP_N, love_weight=LOVE_WEIGHT, language="id"
        )
        rata_rata = hasil["similarity_score"].mean()
        semua_skor.append(rata_rata)

        print(f"\nQuery: '{query}'")
        print(f"Rata-rata similarity score top-{TOP_N}: {rata_rata:.4f}")
        print(hasil[["title", "similarity_score", "final_score"]].to_string(index=False))

    print(f"\n>> Rata-rata similarity score keseluruhan: {sum(semua_skor)/len(semua_skor):.4f}")


def evaluasi_diversity(df, vectorizer, tfidf_matrix):
    """Mengukur keberagaman kategori (sourcefile) pada hasil rekomendasi."""
    print("\n" + "=" * 60)
    print("EVALUASI: DIVERSITY (KERAGAMAN KATEGORI) HASIL REKOMENDASI")
    print("=" * 60)

    for query in QUERY_UJI:
        hasil = recommend_by_ingredients(
            query, df, vectorizer, tfidf_matrix,
            top_n=TOP_N, love_weight=LOVE_WEIGHT, language="id"
        )
        # ambil kategori sourcefile dari index hasil
        kategori = df.loc[hasil.index, "sourcefile"] if "sourcefile" in df.columns else None
        jumlah_kategori_unik = kategori.nunique() if kategori is not None else "N/A"
        print(f"\nQuery: '{query}' -> jumlah kategori unik di top-{TOP_N}: {jumlah_kategori_unik}")


def evaluasi_kualitatif_manual():
    """
    Panduan evaluasi manual (dicatat sendiri oleh peneliti):
    Untuk tiap query di QUERY_UJI, beri label relevan/tidak relevan
    pada masing-masing hasil top-N secara manual, lalu hitung:
        precision@N = (jumlah hasil relevan) / N
    Lakukan ini di luar kode (mis. dicatat di spreadsheet/tabel paper),
    karena relevansi bersifat penilaian manusia (tidak ada ground truth
    otomatis pada dataset ini).
    """
    print("\n" + "=" * 60)
    print("EVALUASI KUALITATIF MANUAL (precision@N)")
    print("=" * 60)
    print(
        "\nUntuk tiap hasil rekomendasi di atas, beri penilaian manual:\n"
        "relevan / tidak relevan, lalu hitung precision@N = "
        "(jumlah relevan) / N. Hasil penilaian ini dicatat di tabel\n"
        "evaluasi pada draft paper bagian Hasil dan Pembahasan."
    )


def main():
    df = pd.read_csv(DATASET_BERSIH_PATH)
    vectorizer, tfidf_matrix = build_tfidf(df, min_df=3)

    print(f"Jumlah resep dievaluasi : {len(df)}")
    print(f"Jumlah fitur TF-IDF     : {len(vectorizer.get_feature_names_out())}")

    evaluasi_similarity_rata_rata(df, vectorizer, tfidf_matrix)
    evaluasi_diversity(df, vectorizer, tfidf_matrix)
    evaluasi_kualitatif_manual()


if __name__ == "__main__":
    main()