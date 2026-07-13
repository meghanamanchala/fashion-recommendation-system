import os
import pandas as pd
import numpy as np
import joblib
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sklearn.metrics.pairwise import cosine_similarity

# Initialize FastAPI app
app = FastAPI(
    title="Fashion Recommendation System API",
    description="FastAPI backend serving content-based fashion recommendations",
    version="1.0.0"
)

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "cleaned_styles.csv")
MODELS_DIR = os.path.join(BASE_DIR, "models")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
STATIC_DIR = os.path.join(BASE_DIR, "static")
IMAGES_DIR = os.path.join(BASE_DIR, "data", "images")

# Global variables for models and data
df = None
vectorizer = None
tfidf_matrix = None
top_recommendations = None
id_to_index = {}

@app.on_event("startup")
def load_assets():
    """Loads CSV data and model files into memory at application startup."""
    global df, vectorizer, tfidf_matrix, top_recommendations, id_to_index
    
    print("Loading data and model files...")
    
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Cleaned CSV not found at: {DATA_PATH}. Please run src/eda.py first.")
    
    df = pd.read_csv(DATA_PATH)
    # Fill any remaining NaNs in display names or strings
    df['productDisplayName'] = df['productDisplayName'].fillna('Unknown Product')
    
    # Store a dictionary mapping product ID to its index for O(1) lookups
    id_to_index = {int(row['id']): idx for idx, row in df.iterrows()}
    print(f"Loaded {len(df)} products.")
    
    # Load model files
    vectorizer_path = os.path.join(MODELS_DIR, "tfidf_vectorizer.joblib")
    matrix_path = os.path.join(MODELS_DIR, "tfidf_matrix.joblib")
    recs_path = os.path.join(MODELS_DIR, "top_recommendations.joblib")
    
    if os.path.exists(vectorizer_path) and os.path.exists(matrix_path) and os.path.exists(recs_path):
        vectorizer = joblib.load(vectorizer_path)
        tfidf_matrix = joblib.load(matrix_path)
        top_recommendations = joblib.load(recs_path)
        print("Model files loaded successfully.")
    else:
        print("WARNING: Model files not found. Recommendations and search will be unavailable. Please run src/recommender.py.")

# Serve static files (CSS, JS, assets)
if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Serve product images
if os.path.exists(IMAGES_DIR):
    app.mount("/images", StaticFiles(directory=IMAGES_DIR), name="images")
elif os.path.exists(os.path.join(BASE_DIR, "data", "myntradataset", "images")):
    app.mount("/images", StaticFiles(directory=os.path.join(BASE_DIR, "data", "myntradataset", "images")), name="images")

@app.get("/")
def read_root():
    """Serves the main HTML page."""
    index_path = os.path.join(TEMPLATES_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Welcome to the Fashion Recommendation API. templates/index.html not found."}

@app.get("/api/products")
def get_products(limit: int = 20, offset: int = 0):
    """Retrieves a paginated list of products for the initial home feed."""
    if df is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
    
    products_slice = df.iloc[offset : offset + limit]
    return products_slice.to_dict(orient="records")

@app.get("/api/product/{product_id}")
def get_product(product_id: int):
    """Retrieves detailed information for a specific product."""
    if df is None:
        raise HTTPException(status_code=500, detail="Data not loaded.")
        
    if product_id not in id_to_index:
        raise HTTPException(status_code=404, detail="Product not found.")
        
    idx = id_to_index[product_id]
    product = df.iloc[idx].to_dict()
    return product

@app.get("/api/search")
def search_products(q: str = Query(..., min_length=1)):
    """
    Searches products using TF-IDF cosine similarity.
    Projects the text query into the product embedding space.
    """
    if df is None or vectorizer is None or tfidf_matrix is None:
        raise HTTPException(status_code=500, detail="Search engine or data not loaded.")
        
    # Transform query to TF-IDF vector
    query_vec = vectorizer.transform([q.lower()])
    
    # Calculate similarity between query and all items
    similarities = cosine_similarity(query_vec, tfidf_matrix).flatten()
    
    # Get top 30 matching products
    top_indices = np.argsort(similarities)[-30:][::-1]
    
    # Filter out items that have 0 similarity to avoid noise
    valid_indices = [idx for idx in top_indices if similarities[idx] > 0.0]
    
    # If no results from TF-IDF (e.g. out of vocabulary words), fall back to simple substring matching
    if len(valid_indices) == 0:
        matches = df[df['productDisplayName'].str.contains(q, case=False, na=False) | 
                     df['articleType'].str.contains(q, case=False, na=False) |
                     df['brand'].str.contains(q, case=False, na=False)]
        results = matches.head(30).to_dict(orient="records")
    else:
        results = df.iloc[valid_indices].copy()
        # Add similarity score to output
        results['score'] = similarities[valid_indices]
        results = results.to_dict(orient="records")
        
    return results

@app.get("/api/recommend/{product_id}")
def recommend_products(product_id: int):
    """
    Serves the precomputed top 10 recommended items for a product ID.
    """
    if df is None or top_recommendations is None:
        raise HTTPException(status_code=500, detail="Recommendation engine or data not loaded.")
        
    if product_id not in id_to_index:
        raise HTTPException(status_code=404, detail="Product not found.")
        
    idx = id_to_index[product_id]
    rec_indices = top_recommendations[idx]
    
    recs = df.iloc[rec_indices].copy()
    return recs.to_dict(orient="records")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
