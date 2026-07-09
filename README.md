# Recipe Recommendation System using Content-Based Filtering

A hybrid recipe recommendation system built with **Python (Flask)** on the backend and **Next.js (TypeScript & TailwindCSS)** on the frontend. The project implements a hybrid recommendation scoring model using **TF-IDF Vectorization, Cosine Similarity, Title Matching, and Min-Max Normalized Popularity Weights** to deliver highly relevant recipe recommendations based on input ingredients.

---

## 🚀 Key Features

* **Cook by Ingredients (Search Tab):** Find recipes based on a custom list of ingredients you have at home.
* **Instant Suggestions & Spell Check:** Typo-tolerant search using fuzzy string matching (`difflib`) to correct typos in user ingredient input.
* **Hybrid Scoring System:** Recipes are ranked using a multi-factor score:
  - **Ingredient Similarity:** Cosine Similarity of TF-IDF vectors representing cleaned recipe ingredients.
  - **Title Relevance:** A bonus matching ratio for recipes whose titles match the search query terms.
  - **Community Popularity:** Likes/Loves count normalized locally and globally.
* **In-Memory Caching:** High-performance search result and similar-recipes caching, reducing subsequent pagination and retrieval times to under **1ms**.
* **Interactive Statistics (EDA Tab):** Dynamic visualizations (bar charts) showing data distribution across protein sources (Ayam, Sapi, Ikan, Udang, Telur, Tahu, Tempe) and overall descriptive analytics.
* **Favorites Tab:** Persistent bookmarking of preferred recipes using LocalStorage.

---

## 📁 Project Structure

```text
rekomendasi_resep/
├── app.py                  # Flask REST API server & caching layer
├── recipe_recommender.py   # Core Recommendation Engine (TF-IDF, Cosine Similarity)
├── eksplorasi_data.py      # Data Preprocessing & Exploratory Data Analysis (EDA) pipeline
├── evaluasi.py             # Quantitative and qualitative evaluation metrics calculator
├── dataset_bersih.csv      # Cleaned and emoji-stripped dataset (14,689 recipes)
├── requirements.txt        # Python dependency list
├── .gitignore              # Git ignore rules for virtualenvs, node_modules, and build outputs
└── frontend/               # Next.js web application dashboard
    ├── app/                # Next.js app routes
    ├── components/         # Premium dashboard UI components (TailwindCSS + shadcn/ui)
    ├── package.json        # NPM dependencies configuration
    └── tsconfig.json       # TypeScript configuration
```

---

## 🛠️ Installation & Setup

### 1. Backend API (Flask)
Prerequisites: Python 3.10+ installed.

1. Navigate to the root directory:
   ```bash
   cd rekomendasi_resep
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the Flask development server:
   ```bash
   python app.py
   ```
   The backend will be running on `http://localhost:5000`.

### 2. Frontend App (Next.js)
Prerequisites: Node.js 18+ installed.

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Run the Next.js development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser to access the dashboard.

---

## 📊 Academic Evaluation Metrics

Based on the quantitative evaluation scripts (`evaluasi.py`), the system yields the following results on standard Indonesian cooking queries:
* **Unique TF-IDF Features:** 2,116 valid cleaned ingredient vocabulary tokens.
* **Overall Average Cosine Similarity:** **0.598** (approx. **60%** keyword match).
* **Average Precision@5 (Human Evaluation):** **0.96** (96% of the top 5 recommended recipes contain exactly the searched ingredients).

---

## 🧑‍💻 Author

* **Najib Ananda**
* **Informatics Department, Duta Bangsa University, Surakarta**
