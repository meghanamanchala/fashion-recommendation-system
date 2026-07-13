import os
import pandas as pd
import numpy as np
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def extract_brand(display_name):
    """
    Heuristically extracts the brand name from the product display name.
    Handles known multi-word brands and falls back to the first word.
    """
    if pd.isna(display_name) or not isinstance(display_name, str):
        return "Unknown"
    
    name_lower = display_name.lower().strip()
    if not name_lower:
        return "Unknown"
        
    # Check for known multi-word brands
    if "united colors of benetton" in name_lower:
        return "United Colors of Benetton"
    elif "peter england" in name_lower:
        return "Peter England"
    elif "reid & taylor" in name_lower:
        return "Reid & Taylor"
    elif "flying machine" in name_lower:
        return "Flying Machine"
    elif "gini and jony" in name_lower or "gini & jony" in name_lower:
        return "Gini & Jony"
    elif "jealous 21" in name_lower:
        return "Jealous 21"
    elif "lino perros" in name_lower:
        return "Lino Perros"
    elif "french connection" in name_lower:
        return "French Connection"
    elif "ben 10" in name_lower:
        return "Ben 10"
    elif "red tape" in name_lower:
        return "Red Tape"
    elif "u.s. polo" in name_lower or "us polo" in name_lower:
        return "U.S. Polo Assn."
    elif "roadster" in name_lower:
        return "Roadster"
        
    # Default to the first word
    tokens = display_name.strip().split()
    return tokens[0] if len(tokens) > 0 else "Unknown"

def build_recommendations(cleaned_csv_path: str, models_dir: str):
    """
    Feature engineering, text tokenization, TF-IDF vectorization, batch cosine similarity computation,
    and serialization of recommendation indexes.
    """
    print("--- Starting Recommendation Model Training & Indexing ---")
    
    # 1. Load Cleaned Dataset
    if not os.path.exists(cleaned_csv_path):
        raise FileNotFoundError(f"Cleaned CSV not found at: {cleaned_csv_path}")
    
    df = pd.read_csv(cleaned_csv_path)
    print(f"Loaded {len(df)} rows of cleaned data.")
    
    # 2. Feature Engineering: Extract Brand
    print("Extracting brand features from productDisplayName...")
    df['brand'] = df['productDisplayName'].apply(extract_brand)
    print(f"Extracted {df['brand'].nunique()} unique brands.")
    
    # 3. Combine Textual Features
    print("Combining textual attributes...")
    # Normalize features to string and lowercase
    features = ['gender', 'articleType', 'baseColour', 'brand', 'usage', 'season']
    for f in features:
        df[f] = df[f].astype(str).str.strip().str.lower()
        
    # Combine required features plus display name for added textual richness
    df['combined_features'] = (
        df['gender'] + " " +
        df['articleType'] + " " +
        df['baseColour'] + " " +
        df['brand'] + " " +
        df['usage'] + " " +
        df['season'] + " " +
        df['productDisplayName'].astype(str).str.strip().str.lower()
    )
    
    # 4. Apply TF-IDF Vectorizer
    print("Applying TF-IDF Vectorizer...")
    vectorizer = TfidfVectorizer(stop_words='english', max_features=15000, ngram_range=(1, 2))
    tfidf_matrix = vectorizer.fit_transform(df['combined_features'])
    print(f"TF-IDF matrix shape: {tfidf_matrix.shape}")
    
    # 5. Compute Batch Cosine Similarity & Extract Top 10 recommendations
    print("Computing recommendations in memory-efficient batches...")
    n_samples = tfidf_matrix.shape[0]
    batch_size = 2000
    top_indices = np.zeros((n_samples, 10), dtype=np.int32)
    
    for i in range(0, n_samples, batch_size):
        end = min(i + batch_size, n_samples)
        # Compute similarity matrix for current batch
        sim_batch = cosine_similarity(tfidf_matrix[i:end], tfidf_matrix) # Shape: (batch, n_samples)
        
        for idx_in_batch in range(end - i):
            global_idx = i + idx_in_batch
            sim_scores = sim_batch[idx_in_batch]
            
            # Argsort gets sorted indices in ascending order (smallest to largest)
            # Take the top 15 candidates to filter out self-recommendation
            top_candidates = np.argsort(sim_scores)[-15:][::-1]
            
            # Filter out the current product itself
            filtered = [idx for idx in top_candidates if idx != global_idx][:10]
            
            # Pad with 0 if necessary
            while len(filtered) < 10:
                filtered.append(0)
                
            top_indices[global_idx] = filtered
            
        print(f"Processed items {i} to {end} out of {n_samples}...")
        
    # 6. Save Artifacts
    print(f"Saving models to: {models_dir}")
    os.makedirs(models_dir, exist_ok=True)
    
    # Save the TF-IDF components for dynamic search queries
    joblib.dump(vectorizer, os.path.join(models_dir, "tfidf_vectorizer.joblib"))
    joblib.dump(tfidf_matrix, os.path.join(models_dir, "tfidf_matrix.joblib"))
    # Save the top 10 recommended indices matrix
    joblib.dump(top_indices, os.path.join(models_dir, "top_recommendations.joblib"))
    
    # Save the final augmented dataset with brand and combined_features columns
    df.to_csv(cleaned_csv_path, index=False)
    print("Successfully saved all model assets and updated cleaned_styles.csv.")
    print("--- Model Training & Indexing Complete ---\n")

if __name__ == "__main__":
    cleaned_path = os.path.join("data", "cleaned_styles.csv")
    models_path = os.path.join("models")
    build_recommendations(cleaned_path, models_path)
