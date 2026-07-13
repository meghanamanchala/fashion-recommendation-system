# Fashion Recommendation System

An end-to-end, production-grade Fashion Recommendation System built with Python, FastAPI, and HTML/CSS. This system loads fashion product metadata, performs exploratory data analysis (EDA), processes textual attributes, builds a content-based recommendation model using TF-IDF and Cosine Similarity, and serves them via a web UI.

## Project Features
1. **Exploratory Data Analysis (EDA):** Complete analysis of the dataset, missing values, duplicates, and category distributions.
2. **Feature Engineering:** Combining high-signal textual metadata (Product Type, Colour, Brand, Gender, Usage, Season).
3. **Recommendation Engine:** Uses TF-IDF vectorization and Cosine Similarity to find and recommend the top 10 similar products.
4. **FastAPI Backend:** A lightweight and performant backend to handle queries and serve recommendations.
5. **Modern Frontend:** An elegant, responsive web page built with HTML and modern CSS (glassmorphism, subtle micro-animations) to search for products and view suggestions.
6. **Clean Architecture:** Modular, production-ready code structure.

## Project Structure
```text
fashion-recommendation/
│
├── data/                  # Datasets (raw, cleaned)
├── notebooks/             # EDA and prototyping notebooks
├── src/                   # Core pipeline modules (EDA, recommender, evaluation)
├── api/                   # FastAPI backend implementation
├── templates/             # HTML templates for rendering UI
├── static/                # CSS, JS, and image assets
├── models/                # Saved models (TF-IDF weights, matrices)
├── requirements.txt       # Project dependencies
└── README.md              # Project documentation (this file)
```

## Setup Instructions

### 1. Clone & Set Up Virtual Environment
```bash
# Clone the repository
git clone https://github.com/meghanamanchala/fashion-recommendation-system.git
cd fashion-recommendation-system

# Create and activate virtual environment
python -m venv venv
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Linux/macOS:
source venv/bin/activate
```

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run Pipeline (EDA, Modeling, and Artifact Generation)
```bash
# Perform EDA & prepare clean data
python src/eda.py

# Train/build recommendation index
python src/recommender.py

# Evaluate recommender
python src/evaluate.py
```

### 4. Launch FastAPI Server
```bash
python api/main.py
```
Or use Uvicorn directly:
```bash
uvicorn api.main:app --reload
```
Visit http://127.0.0.1:8000 in your browser to interact with the system.

## Technologies Used
- **Backend:** FastAPI, Uvicorn
- **Data & ML:** Pandas, NumPy, Scikit-Learn, NLTK
- **Frontend:** HTML5, CSS3 (Modern responsive grid & custom animations)
