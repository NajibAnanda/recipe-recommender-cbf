"""
Tahap 4: Prototype Web - Sistem Rekomendasi Resep Makanan (Flask Backend)
-------------------------------------------------------------
Aplikasi Flask untuk menyediakan API Sistem Rekomendasi Resep
berbasis Content-Based Filtering (TF-IDF + Cosine Similarity)
dengan pembobotan popularitas (loves) dan antarmuka kustom.
Juga terintegrasi dengan scraper gambar asinkron, sistem caching,
dashboard statistik EDA, dan sistem paginasi sisi server.

Jalankan dengan: python app.py
"""

# pyrefly: ignore [missing-import]
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import urllib.request
import difflib
import re
import json
import os
from concurrent.futures import ThreadPoolExecutor
from recipe_recommender import build_tfidf, recommend_by_ingredients, recommend_similar_recipes, clean_text, normalize_loves
from sklearn.metrics.pairwise import cosine_similarity

app = Flask(__name__)
CORS(app)

DATASET_BERSIH_PATH = "dataset_bersih.csv"
IMAGE_CACHE_PATH = "image_cache.json"

# Global data & model cache
df = None
vectorizer = None
tfidf_matrix = None
image_cache = {}
vocab_set = set()
vocab_list = []
recommendation_cache = {}
similar_cache = {}

def correct_spelling(query_str):
    if not query_str or not vocab_set:
        return query_str
        
    # Ambil kata-kata alphanumeric dengan panjang > 1
    words = re.findall(r'\w+', query_str.lower())
    corrected_words = []
    
    for w in words:
        if len(w) <= 2:
            corrected_words.append(w)
            continue
            
        # Jika kata sudah ada di database, tidak perlu dikoreksi
        if w in vocab_set:
            corrected_words.append(w)
        else:
            # Cari kata terdekat dengan cutoff kemiripan 0.7
            matches = difflib.get_close_matches(w, vocab_list, n=1, cutoff=0.7)
            if matches:
                corrected_words.append(matches[0])
            else:
                corrected_words.append(w)
                
    return " ".join(corrected_words)

def load_image_cache():
    global image_cache
    if os.path.exists(IMAGE_CACHE_PATH):
        try:
            with open(IMAGE_CACHE_PATH, 'r', encoding='utf-8') as f:
                image_cache = json.load(f)
            print(f"Loaded {len(image_cache):,} image URLs from cache.")
        except Exception as e:
            print("Error loading image cache:", e)
            image_cache = {}

def save_image_cache():
    try:
        with open(IMAGE_CACHE_PATH, 'w', encoding='utf-8') as f:
            json.dump(image_cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print("Error saving image cache:", e)

def scrape_single_image(url_path):
    """Scrape single image URL from Cookpad recipe page."""
    if not url_path or not isinstance(url_path, str):
        return None
        
    # Check cache first
    if url_path in image_cache:
        return image_cache[url_path]
        
    full_url = f"https://cookpad.com{url_path}"
    try:
        req = urllib.request.Request(
            full_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'}
        )
        # Timeout pendek 1.5 detik agar backend tidak hang lama
        with urllib.request.urlopen(req, timeout=1.5) as response:
            html = response.read().decode('utf-8', errors='ignore')
            
            # Pola 1: properti og:image berada sebelum content
            match = re.search(r'<meta[^>]*property=["\']og:image["\'][^>]*content=["\']([^"\']+)["\']', html)
            if match:
                img_url = match.group(1)
                image_cache[url_path] = img_url
                return img_url
                
            # Pola 2: content berada sebelum properti og:image
            match2 = re.search(r'<meta[^>]*content=["\']([^"\']+)["\'][^>]*property=["\']og:image["\']', html)
            if match2:
                img_url = match2.group(1)
                image_cache[url_path] = img_url
                return img_url
    except Exception as e:
        print(f"Failed to scrape image for {url_path}: {e}")
        
    return None

def fetch_images_for_recipes(recipe_urls):
    """Mengambil beberapa gambar resep secara paralel menggunakan ThreadPoolExecutor."""
    with ThreadPoolExecutor(max_workers=5) as executor:
        results = list(executor.map(scrape_single_image, recipe_urls))
    save_image_cache()
    return results

def init_data():
    global df, vectorizer, tfidf_matrix, vocab_set, vocab_list
    print("Loading clean dataset...")
    df = pd.read_csv(DATASET_BERSIH_PATH)
    
    # Konversi loves menjadi integer
    df['loves'] = pd.to_numeric(df['loves'], errors='coerce').fillna(0).astype(int)
    print(f"Loaded {len(df):,} recipes.")
    
    print("Building TF-IDF model...")
    vectorizer, tfidf_matrix = build_tfidf(df, min_df=3)
    print("TF-IDF model built successfully.")
    
    # Ekstrak kata-kata unik untuk koreksi ejaan
    print("Building vocabulary database for spelling correction...")
    unique_words = set()
    for title in df['title'].dropna():
        for w in re.findall(r'\w+', str(title).lower()):
            if len(w) > 2:
                unique_words.add(w)
                
    # Tambahkan kata-kata dari daftar bahan hasil TF-IDF
    unique_words.update(vectorizer.get_feature_names_out())
    vocab_set = unique_words
    vocab_list = list(unique_words)
    print(f"Vocabulary loaded with {len(vocab_list):,} unique words for spell checking.")
    
    # Load image cache
    load_image_cache()

# Muat data saat server dimulai
init_data()

@app.route('/')
def index():
    return jsonify({
        "status": "ok",
        "message": "Sistem Rekomendasi Resep API Backend",
        "version": "1.0.0"
    })

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    """Mengembalikan daftar semua judul resep untuk autocomplete pada frontend."""
    if df is not None:
        titles = df['title'].tolist()
        return jsonify(titles)
    return jsonify([])

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Mengembalikan statistik ringkasan dan distribusi kategori resep untuk dashboard."""
    if df is None:
        return jsonify({"error": "Dataset belum dimuat."}), 500
        
    try:
        # 1. Distribusi Kategori (SourceFile)
        category_counts = df['sourcefile'].value_counts().to_dict()
        
        # 2. Top 5 Resep terpopuler dengan detail lengkap & gambar
        top_popular_df = df.sort_values(by='loves', ascending=False).head(5).copy()
        top_popular_df = top_popular_df.fillna({
            'loves': 0,
            'url': '',
            'ingredients': '',
            'steps': '',
            'sourcefile': ''
        })
        top_popular_df['loves'] = top_popular_df['loves'].astype(int)
        
        if 'similarity_score' not in top_popular_df.columns:
            top_popular_df['similarity_score'] = 1.0
        if 'final_score' not in top_popular_df.columns:
            top_popular_df['final_score'] = top_popular_df['loves'].astype(float)
            
        # Scrape gambar
        urls = top_popular_df['url'].tolist()
        image_urls = fetch_images_for_recipes(urls)
        top_popular_df['image_url'] = image_urls
        top_popular_df['image_url'] = top_popular_df['image_url'].fillna('')
        
        top_popular = top_popular_df.to_dict(orient='records')
        
        # 3. Ringkasan metrik
        total_recipes = len(df)
        avg_loves = float(df['loves'].mean())
        
        return jsonify({
            "category_counts": category_counts,
            "top_popular": top_popular,
            "total_recipes": total_recipes,
            "avg_loves": round(avg_loves, 2)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/recommend', methods=['POST'])
def get_recommendations():
    """Rekomendasi resep berdasarkan input bahan masakan dengan paginasi dan filter relevansi."""
    data = request.get_json() or {}
    query = data.get('query', '').strip()
    page = int(data.get('page', 1))
    
    if not query:
        return jsonify({"error": "Masukkan bahan masakan terlebih dahulu."}), 400
        
    try:
        # Koreksi ejaan kata kunci pencarian
        corrected_query = correct_spelling(query)
        cleaned_input = clean_text(corrected_query, "id")
        
        # Gunakan cache pencarian jika query sudah pernah dihitung sebelumnya
        if cleaned_input in recommendation_cache:
            recs = recommendation_cache[cleaned_input]
            print(f"Cache HIT for query: '{query}' (cleaned: '{cleaned_input}')")
        else:
            print(f"Cache MISS for query: '{query}'. Calculating TF-IDF and similarity...")
            # 1. Hitung Similarity Score (TF-IDF bahan)
            if cleaned_input:
                input_vector = vectorizer.transform([cleaned_input])
                similarity_scores = cosine_similarity(input_vector, tfidf_matrix).flatten()
            else:
                similarity_scores = np.zeros(len(df))
                
            # 2. Hitung Title Score berdasarkan kata kunci pencarian
            query_words = [w for w in re.findall(r'\w+', corrected_query.lower()) if len(w) > 1]
            title_scores = []
            
            if query_words:
                phrase = " ".join(query_words)
                for title in df['title']:
                    title_lower = str(title).lower()
                    matches = sum(1 for w in query_words if w in title_lower)
                    match_ratio = matches / len(query_words)
                    
                    # Bonus jika frasa lengkap berurutan cocok di judul
                    if phrase in title_lower:
                        title_score = 0.5 + 0.5 * match_ratio
                    else:
                        title_score = 0.5 * match_ratio
                    title_scores.append(title_score)
                title_scores = np.array(title_scores)
            else:
                title_scores = np.zeros(len(df))
                
            # 3. Hitung Love Score (normalisasi Loves)
            love_scores = normalize_loves(df).to_numpy()
            
            # 4. Kombinasikan menjadi Final Score (Hybrid)
            final_scores = np.zeros(len(df))
            
            has_title_match = title_scores > 0
            final_scores[has_title_match] = (
                0.5 * title_scores[has_title_match] + 
                0.3 * similarity_scores[has_title_match] + 
                0.2 * love_scores[has_title_match]
            )
            final_scores[~has_title_match] = (
                0.8 * similarity_scores[~has_title_match] + 
                0.2 * love_scores[~has_title_match]
            )
                
            # Buat dataframe hasil pencarian
            recs = df.copy()
            recs["similarity_score"] = similarity_scores
            recs["title_score"] = title_scores
            recs["final_score"] = final_scores
            
            # Saring hasil: hanya yang memiliki kecocokan judul ATAU kemiripan bahan > 0
            recs = recs[(recs["title_score"] > 0) | (recs["similarity_score"] > 0)]
            
            # Urutkan berdasarkan final_score secara menurun
            recs = recs.sort_values(by='final_score', ascending=False)
            
            # Simpan hasil perhitungan ke cache (batasi ukuran cache maks 100 entri)
            if len(recommendation_cache) >= 100:
                # Hapus entri tertua
                recommendation_cache.pop(next(iter(recommendation_cache)))
            recommendation_cache[cleaned_input] = recs

        # Hitung paginasi
        total_results = len(recs)
        per_page = 12
        total_pages = (total_results + per_page - 1) // per_page if total_results > 0 else 0
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
            
        start_idx = (page - 1) * per_page
        end_idx = page * per_page
        paginated_recs = recs.iloc[start_idx:end_idx].copy()
        
        # Penanganan NaN untuk validitas JSON
        paginated_recs = paginated_recs.fillna({
            'loves': 0,
            'url': '',
            'ingredients': '',
            'steps': '',
            'similarity_score': 0.0,
            'final_score': 0.0,
            'sourcefile': ''
        })
        
        paginated_recs['loves'] = paginated_recs['loves'].astype(int)
        
        # Ambil gambar secara paralel HANYA untuk 12 resep halaman aktif ini
        urls = paginated_recs['url'].tolist()
        image_urls = fetch_images_for_recipes(urls)
        paginated_recs['image_url'] = image_urls
        paginated_recs['image_url'] = paginated_recs['image_url'].fillna('')
        
        recs_list = paginated_recs.to_dict(orient='records')
        return jsonify({
            "results": recs_list,
            "total_pages": total_pages,
            "current_page": page,
            "total_results": total_results,
            "corrected_query": corrected_query
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/similar', methods=['POST'])
def get_similar():
    """Rekomendasi resep yang mirip dengan resep pilihan dengan paginasi dan filter relevansi."""
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    page = int(data.get('page', 1))
    
    if not title:
        return jsonify({"error": "Pilih judul resep terlebih dahulu."}), 400
        
    try:
        # Gunakan cache resep serupa jika sudah pernah dihitung sebelumnya
        if title in similar_cache:
            recs = similar_cache[title]
            print(f"Cache HIT for similar recipes of: '{title}'")
        else:
            print(f"Cache MISS for similar recipes of: '{title}'. Calculating...")
            matches = df[df['title'] == title]
            if matches.empty:
                return jsonify({"error": "Resep tidak ditemukan di database."}), 404
                
            recipe_index = matches.index[0]
            recs = recommend_similar_recipes(
                recipe_index, df, tfidf_matrix,
                top_n=300, love_weight=0.2
            )
            
            # Saring: Hanya resep dengan kemiripan > 0.0 yang relevan
            recs = recs[recs['similarity_score'] > 0.0]
            
            # Simpan ke cache (batasi maks 100 entri)
            if len(similar_cache) >= 100:
                similar_cache.pop(next(iter(similar_cache)))
            similar_cache[title] = recs
        
        # Hitung paginasi
        total_results = len(recs)
        per_page = 12
        total_pages = (total_results + per_page - 1) // per_page if total_results > 0 else 0
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
            
        start_idx = (page - 1) * per_page
        end_idx = page * per_page
        paginated_recs = recs.iloc[start_idx:end_idx].copy()
        
        # Penanganan NaN untuk validitas JSON
        paginated_recs = paginated_recs.fillna({
            'loves': 0,
            'url': '',
            'ingredients': '',
            'steps': '',
            'similarity_score': 0.0,
            'final_score': 0.0,
            'sourcefile': ''
        })
        
        paginated_recs['loves'] = paginated_recs['loves'].astype(int)
        
        # Ambil gambar secara paralel HANYA untuk 12 resep halaman aktif ini
        urls = paginated_recs['url'].tolist()
        image_urls = fetch_images_for_recipes(urls)
        paginated_recs['image_url'] = image_urls
        paginated_recs['image_url'] = paginated_recs['image_url'].fillna('')
        
        recs_list = paginated_recs.to_dict(orient='records')
        return jsonify({
            "results": recs_list,
            "total_pages": total_pages,
            "current_page": page,
            "total_results": total_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/popular', methods=['GET'])
def get_popular():
    """Mengembalikan daftar resep terpopuler berdasarkan Loves/Likes dengan paginasi dan filter kategori/kesulitan."""
    page = int(request.args.get('page', 1))
    category = request.args.get('category', '').strip().lower()
    difficulty = request.args.get('difficulty', '').strip().lower()
    per_page = 12
    try:
        filtered_df = df.copy()
        
        # 1. Filter Kategori
        if category and category != 'all':
            filtered_df = filtered_df[filtered_df['sourcefile'].str.contains(category, case=False, na=False)]
            
        # 2. Filter Kesulitan berdasarkan Jumlah Langkah (steps)
        if difficulty and difficulty != 'all':
            def count_steps(steps_str):
                if not isinstance(steps_str, str):
                    return 0
                return len([s for s in steps_str.split('--') if s.strip()])
            
            steps_counts = filtered_df['steps'].apply(count_steps)
            if difficulty == 'easy':
                filtered_df = filtered_df[steps_counts <= 5]
            elif difficulty == 'medium':
                filtered_df = filtered_df[(steps_counts > 5) & (steps_counts <= 10)]
            elif difficulty == 'hard':
                filtered_df = filtered_df[steps_counts > 10]
                
        sorted_df = filtered_df.sort_values(by='loves', ascending=False)
        total_results = len(sorted_df)
        total_pages = (total_results + per_page - 1) // per_page if total_results > 0 else 0
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
            
        start_idx = (page - 1) * per_page
        end_idx = page * per_page
        paginated = sorted_df.iloc[start_idx:end_idx].copy()
        
        paginated = paginated.fillna({
            'loves': 0,
            'url': '',
            'ingredients': '',
            'steps': '',
            'similarity_score': 0.0,
            'final_score': 0.0,
            'sourcefile': ''
        })
        paginated['loves'] = paginated['loves'].astype(int)
        
        # Scrape gambar
        urls = paginated['url'].tolist()
        image_urls = fetch_images_for_recipes(urls)
        paginated['image_url'] = image_urls
        paginated['image_url'] = paginated['image_url'].fillna('')
        
        if 'similarity_score' not in paginated.columns:
            paginated['similarity_score'] = 1.0
        if 'final_score' not in paginated.columns:
            max_loves = float(df['loves'].max()) if df['loves'].max() > 0 else 1.0
            paginated['final_score'] = paginated['loves'].astype(float) / max_loves
            
        results = paginated.to_dict(orient='records')
        return jsonify({
            "results": results,
            "total_pages": total_pages,
            "current_page": page,
            "total_results": total_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/category', methods=['GET'])
def get_by_category():
    """Mengembalikan resep berdasarkan filter file sumber (bahan utama) dengan paginasi."""
    category = request.args.get('category', '').strip()
    page = int(request.args.get('page', 1))
    per_page = 12
    
    if not category:
        return jsonify({"error": "Pilih kategori terlebih dahulu."}), 400
        
    try:
        matched_df = df[df['sourcefile'].str.contains(category, case=False, na=False)]
        matched_df = matched_df.sort_values(by='loves', ascending=False)
        
        total_results = len(matched_df)
        total_pages = (total_results + per_page - 1) // per_page if total_results > 0 else 0
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
            
        start_idx = (page - 1) * per_page
        end_idx = page * per_page
        paginated = matched_df.iloc[start_idx:end_idx].copy()
        
        paginated = paginated.fillna({
            'loves': 0,
            'url': '',
            'ingredients': '',
            'steps': '',
            'similarity_score': 0.0,
            'final_score': 0.0,
            'sourcefile': ''
        })
        paginated['loves'] = paginated['loves'].astype(int)
        
        # Scrape gambar
        urls = paginated['url'].tolist()
        image_urls = fetch_images_for_recipes(urls)
        paginated['image_url'] = image_urls
        paginated['image_url'] = paginated['image_url'].fillna('')
        
        if 'similarity_score' not in paginated.columns:
            paginated['similarity_score'] = 1.0
        if 'final_score' not in paginated.columns:
            max_loves = float(matched_df['loves'].max()) if len(matched_df) > 0 and matched_df['loves'].max() > 0 else 1.0
            paginated['final_score'] = paginated['loves'].astype(float) / max_loves
            
        results = paginated.to_dict(orient='records')
        return jsonify({
            "results": results,
            "total_pages": total_pages,
            "current_page": page,
            "total_results": total_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/catalog', methods=['GET'])
def get_catalog():
    """Mengembalikan daftar semua resep dengan filter pencarian, kategori, dan paginasi server-side."""
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    search = request.args.get('search', '').strip().lower()
    category = request.args.get('category', '').strip().lower()
    
    try:
        filtered_df = df.copy()
        
        # 1. Filter Pencarian Judul & Hitung Similarity
        if search:
            # Hitung similarity berdasarkan TF-IDF bahan
            cleaned_search = clean_text(search, "id")
            if cleaned_search:
                search_vector = vectorizer.transform([cleaned_search])
                sim_scores = cosine_similarity(search_vector, tfidf_matrix).flatten()
                filtered_df['similarity_score'] = sim_scores
            else:
                filtered_df['similarity_score'] = 0.0
            
            # Filter baris yang judulnya mengandung kata pencarian
            filtered_df = filtered_df[filtered_df['title'].str.lower().str.contains(search, na=False)]
        else:
            filtered_df['similarity_score'] = 1.0

        # 2. Filter Kategori
        if category and category != 'all':
            filtered_df = filtered_df[filtered_df['sourcefile'].str.contains(category, case=False, na=False)]
            
        # Sort: Jika sedang mencari dan ada kecocokan bahan, urutkan berdasarkan final_score.
        # Jika tidak, urutkan berdasarkan loves.
        if search and 'similarity_score' in filtered_df.columns and filtered_df['similarity_score'].max() > 0:
            filtered_df['final_score'] = 0.8 * filtered_df['similarity_score'] + 0.2 * normalize_loves(filtered_df)
            filtered_df = filtered_df.sort_values(by='final_score', ascending=False)
        else:
            filtered_df = filtered_df.sort_values(by='loves', ascending=False)
        
        total_results = len(filtered_df)
        total_pages = (total_results + per_page - 1) // per_page if total_results > 0 else 0
        
        if page < 1:
            page = 1
        elif page > total_pages and total_pages > 0:
            page = total_pages
            
        start_idx = (page - 1) * per_page
        end_idx = page * per_page
        paginated = filtered_df.iloc[start_idx:end_idx].copy()
        
        # Penanganan NaN
        paginated = paginated.fillna({
            'loves': 0,
            'url': '',
            'ingredients': '',
            'steps': '',
            'similarity_score': 1.0,
            'final_score': 0.0,
            'sourcefile': ''
        })
        paginated['loves'] = paginated['loves'].astype(int)
        
        if 'similarity_score' not in paginated.columns:
            paginated['similarity_score'] = 1.0
        if 'final_score' not in paginated.columns:
            max_loves = float(df['loves'].max()) if df['loves'].max() > 0 else 1.0
            paginated['final_score'] = paginated['loves'].astype(float) / max_loves
            
        # Scrape gambar
        urls = paginated['url'].tolist()
        image_urls = fetch_images_for_recipes(urls)
        paginated['image_url'] = image_urls
        paginated['image_url'] = paginated['image_url'].fillna('')
        
        results = paginated.to_dict(orient='records')
        return jsonify({
            "results": results,
            "total_pages": total_pages,
            "current_page": page,
            "total_results": total_results
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Jalankan server secara lokal (force reload final)
    app.run(host='127.0.0.1', port=5000, debug=True)