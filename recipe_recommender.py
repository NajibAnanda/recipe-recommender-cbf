"""
Sistem Rekomendasi Resep Makanan
Content-Based Filtering menggunakan TF-IDF + Cosine Similarity
dengan pembobotan popularitas (kolom 'loves')

Kolom dataset yang diharapkan:
- title          : nama resep
- ingredients    : daftar bahan (teks)
- steps          : langkah memasak (teks, opsional dipakai)
- loves          : jumlah suka/popularitas resep (angka)
- url            : tautan sumber resep
- ingredientlength : jumlah bahan
- steplength       : jumlah langkah
- sourcefile       : sumber data
"""

import re
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity, linear_kernel


# ---------------------------------------------------------------------------
# 1. STOPWORDS & UNIT KATA YANG TIDAK INFORMATIF
# ---------------------------------------------------------------------------
# Disusun berdasarkan pola nyata di dataset (resep Bahasa Indonesia ala
# Cookpad: satuan ukur, kata penghubung, dan kata keterangan jumlah/cara
# potong sering menempel di depan nama bahan, misal "7 Bawang Merah",
# "3 ruas jari Laos", "secukupnya Garam".

STOPWORDS_ID = {
    # kata penghubung / keterangan umum
    "dan", "atau", "yang", "untuk", "dengan", "secukupnya", "sesuai",
    "selera", "agak", "sedikit", "kira", "kurang", "lebih", "sesuai",
    # satuan jumlah/ukuran
    "buah", "siung", "lembar", "butir", "potong", "iris", "ekor",
    "batang", "ruas", "jari", "biji", "papan", "ikat", "genggam",
    "bungkus", "sachet", "kotak", "kaleng", "bonggol", "rumpun",
    "lonjor", "keping", "ons", "gelas", "mangkok",
    # satuan berat/volume
    "sdm", "sdt", "sendok", "makan", "teh", "gram", "gr", "kg", "ml",
    "liter", "cm", "mm",
    # kata kerja persiapan bahan (tidak menambah info kemiripan bahan)
    "potong", "dipotong", "iris", "diiris", "haluskan", "dihaluskan",
    "geprek", "digeprek", "memarkan", "dimemarkan", "rajang", "dirajang",
    "kupas", "dikupas", "cuci", "dicuci", "bersih",
}

STOPWORDS_EN = {
    "and", "or", "the", "of", "to", "taste", "cup", "cups", "tbsp",
    "tsp", "tablespoon", "teaspoon", "ounce", "oz", "gram", "grams",
    "pound", "lb", "ml", "liter", "inch", "piece", "pieces", "sliced",
    "chopped", "diced", "minced", "fresh",
}


# ---------------------------------------------------------------------------
# 2. LOAD DATASET
# ---------------------------------------------------------------------------
def load_data(path: str) -> pd.DataFrame:
    """
    Memuat dataset resep dari file CSV asli.
    Mendukung format pemisah koma (,) dan titik-koma (;).
    """
    try:
        # Coba load dengan pemisah koma (standard CSV)
        df = pd.read_csv(
            path,
            sep=",",
            encoding="latin1",
            dtype=str,
        )
        # Verifikasi kolom penting ada, jika tidak, lempar error ke fallback
        cols_lower = [c.strip().lower() for c in df.columns]
        if "title" not in cols_lower or "ingredients" not in cols_lower:
            raise ValueError("Kolom penting tidak ditemukan dengan pemisah koma.")
    except Exception:
        # Fallback ke format lama (pemisah titik-koma dan skip baris pertama)
        df = pd.read_csv(
            path,
            sep=";",
            skiprows=[0],      # buang baris "Column1, Column2, ..." yang tidak berguna
            header=0,          # baris berikutnya (Title, Ingredients, ...) jadi header
            encoding="latin1",
            dtype=str,
        )
        
    df.columns = [c.strip().lower() for c in df.columns]
    # buang kolom kosong/sisa hasil titik-koma berlebih (Unnamed: 8, '=', dst)
    df = df.loc[:, ~df.columns.str.contains("^unnamed")]
    df = df.drop(columns=["="], errors="ignore")
    return df


def split_items(text: str) -> list:
    """
    Memecah string ingredients/steps yang dipisah dengan '--' menjadi list item.
    Contoh input: "1 Ekor Ayam--2 Buah Jeruk Nipis--2 Sdm Garam--"
    Contoh output: ["1 Ekor Ayam", "2 Buah Jeruk Nipis", "2 Sdm Garam"]
    """
    if not isinstance(text, str):
        return []
    items = [item.strip() for item in text.split("--")]
    return [item for item in items if item != ""]


# ---------------------------------------------------------------------------
# 3. PREPROCESSING TEKS
# ---------------------------------------------------------------------------
def clean_text(text: str, language: str = "id") -> str:
    """
    Membersihkan teks bahan (ingredients):
    - pecah per item berdasarkan pemisah '--'
    - lowercase
    - hapus angka, pecahan (1/2, 1 1/2), & simbol
    - hapus satuan ukur dan stopword tidak informatif
    - gabungkan kembali jadi satu string siap diolah TF-IDF
    """
    if not isinstance(text, str):
        return ""

    stopwords = STOPWORDS_ID if language == "id" else STOPWORDS_EN
    items = split_items(text)

    cleaned_tokens = []
    for item in items:
        item = item.lower()
        item = re.sub(r"\(.*?\)", " ", item)              # hapus catatan dalam kurung, mis. "(potong 12)"
        item = re.sub(r"\d+\s*/\s*\d+", " ", item)         # hapus pecahan, mis. "1/2"
        item = re.sub(r"\d+([.,]\d+)?", " ", item)         # hapus angka biasa/desimal
        item = re.sub(r"[^\w\s]", " ", item)                # hapus tanda baca/simbol/emoji
        tokens = item.split()
        tokens = [t for t in tokens if t not in stopwords and len(t) > 1]
        cleaned_tokens.extend(tokens)

    return " ".join(cleaned_tokens)


def preprocess_dataframe(df: pd.DataFrame, language: str = "id") -> pd.DataFrame:
    """Menerapkan cleaning ke kolom ingredients dan menghapus data kosong/duplikat."""
    df = df.copy()
    df = df.dropna(subset=["title", "ingredients"])
    df = df.drop_duplicates(subset=["title", "ingredients"])
    df["clean_ingredients"] = df["ingredients"].apply(lambda x: clean_text(x, language))
    df = df[df["clean_ingredients"].str.strip() != ""]
    df = df.reset_index(drop=True)
    return df


# ---------------------------------------------------------------------------
# 4. TF-IDF VECTORIZATION
# ---------------------------------------------------------------------------
def build_tfidf(df: pd.DataFrame, text_column: str = "clean_ingredients", min_df: int = 3):
    """
    Membangun matriks TF-IDF dari kolom bahan yang sudah dibersihkan.

    min_df=3 artinya kata harus muncul di minimal 3 resep berbeda untuk
    dianggap sebagai fitur valid. Ini penting untuk dataset user-generated
    seperti ini karena banyak typo/kata aneh (mis. "bwang", "untk",
    "secukupunya") yang hanya muncul 1 kali dan akan jadi noise kalau
    tidak difilter.
    """
    vectorizer = TfidfVectorizer(min_df=min_df)
    tfidf_matrix = vectorizer.fit_transform(df[text_column])
    return vectorizer, tfidf_matrix


# ---------------------------------------------------------------------------
# 5. POPULARITAS (kolom 'loves') -> dinormalisasi 0-1
# ---------------------------------------------------------------------------
def normalize_loves(df: pd.DataFrame, column: str = "loves") -> pd.Series:
    if column not in df.columns:
        return pd.Series([0] * len(df))
    values = pd.to_numeric(df[column], errors="coerce").fillna(0)
    if values.max() == values.min():
        return pd.Series([0] * len(df))
    return (values - values.min()) / (values.max() - values.min())


# ---------------------------------------------------------------------------
# 6a. REKOMENDASI BERDASARKAN INPUT BAHAN DARI USER
# ---------------------------------------------------------------------------
def recommend_by_ingredients(
    input_ingredients: str,
    df: pd.DataFrame,
    vectorizer: TfidfVectorizer,
    tfidf_matrix,
    top_n: int = 5,
    love_weight: float = 0.3,
    language: str = "id",
) -> pd.DataFrame:
    """
    Memberi rekomendasi resep berdasarkan daftar bahan yang diinput user.
    love_weight: porsi kontribusi popularitas (0 = murni similarity, 1 = murni popularitas)
    """
    cleaned_input = clean_text(input_ingredients, language)
    input_vector = vectorizer.transform([cleaned_input])

    similarity_scores = cosine_similarity(input_vector, tfidf_matrix).flatten()
    love_scores = normalize_loves(df).to_numpy()

    final_scores = (1 - love_weight) * similarity_scores + love_weight * love_scores

    result = df.copy()
    result["similarity_score"] = similarity_scores
    result["final_score"] = final_scores

    return result.sort_values("final_score", ascending=False).head(top_n)[
        ["title", "ingredients", "loves", "similarity_score", "final_score", "url", "steps", "sourcefile"]
    ]


# ---------------------------------------------------------------------------
# 6b. REKOMENDASI RESEP MIRIP (item-to-item) BERDASARKAN INDEX RESEP
# ---------------------------------------------------------------------------
def recommend_similar_recipes(
    recipe_index: int,
    df: pd.DataFrame,
    tfidf_matrix,
    top_n: int = 5,
    love_weight: float = 0.3,
) -> pd.DataFrame:
    """Memberi rekomendasi resep lain yang mirip dengan satu resep tertentu (berdasarkan index baris)."""
    similarity_scores = linear_kernel(tfidf_matrix[recipe_index], tfidf_matrix).flatten()
    love_scores = normalize_loves(df).to_numpy()

    final_scores = (1 - love_weight) * similarity_scores + love_weight * love_scores

    result = df.copy()
    result["similarity_score"] = similarity_scores
    result["final_score"] = final_scores

    # buang resep itu sendiri dari hasil
    result = result.drop(index=recipe_index)

    return result.sort_values("final_score", ascending=False).head(top_n)[
        ["title", "ingredients", "loves", "similarity_score", "final_score", "url", "steps", "sourcefile"]
    ]


# ---------------------------------------------------------------------------
# 7. CONTOH PEMAKAIAN
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    DATASET_PATH = "dataset_resep.csv"   # ganti dengan path dataset asli kamu
    LANGUAGE = "id"                      # ganti "en" jika dataset berbahasa Inggris

    df_raw = load_data(DATASET_PATH)
    df_clean = preprocess_dataframe(df_raw, language=LANGUAGE)

    vectorizer, tfidf_matrix = build_tfidf(df_clean)

    # Contoh 1: rekomendasi berdasarkan bahan yang dimiliki user
    user_input = "ayam bawang putih cabai"
    hasil = recommend_by_ingredients(
        user_input, df_clean, vectorizer, tfidf_matrix, top_n=5, language=LANGUAGE
    )
    print("Rekomendasi berdasarkan bahan:\n", hasil)

    # Contoh 2: rekomendasi resep mirip dari satu resep (misal index ke-0)
    hasil_mirip = recommend_similar_recipes(0, df_clean, tfidf_matrix, top_n=5)
    print("\nResep mirip dengan resep index 0:\n", hasil_mirip)