import os
import pandas as pd
import numpy as np
import joblib

def evaluate_recommender(cleaned_csv_path: str, models_dir: str, sample_size: int = 1000):
    """
    Evaluates the quality of the content-based recommendation system.
    Computes consistency metrics (gender, article type, subcategory, and overall attribute overlap)
    across a random sample of products.
    """
    print("--- Starting Recommendation System Evaluation ---")
    
    # 1. Load data and recommendation indices
    if not os.path.exists(cleaned_csv_path):
        raise FileNotFoundError(f"Cleaned CSV not found at: {cleaned_csv_path}")
        
    df = pd.read_csv(cleaned_csv_path)
    
    rec_indices_path = os.path.join(models_dir, "top_recommendations.joblib")
    if not os.path.exists(rec_indices_path):
        raise FileNotFoundError(f"Recommendation indices not found at: {rec_indices_path}")
        
    top_indices = joblib.load(rec_indices_path)
    
    print(f"Dataset size: {len(df)} products.")
    print(f"Recommendation indices matrix shape: {top_indices.shape}")
    
    # Set random seed for reproducibility
    np.random.seed(42)
    sample_indices = np.random.choice(len(df), size=min(sample_size, len(df)), replace=False)
    
    article_type_matches = []
    sub_category_matches = []
    gender_matches = []
    color_matches = []
    brand_matches = []
    usage_matches = []
    season_matches = []
    
    print(f"Evaluating metrics on a random sample of {len(sample_indices)} products...")
    
    for idx in sample_indices:
        query_item = df.iloc[idx]
        rec_idx_list = top_indices[idx]
        
        for r_idx in rec_idx_list:
            rec_item = df.iloc[r_idx]
            
            # Check consistency of individual features
            article_type_matches.append(query_item['articleType'] == rec_item['articleType'])
            sub_category_matches.append(query_item['subCategory'] == rec_item['subCategory'])
            
            # Gender match: direct match or either is 'unisex'
            g_match = (query_item['gender'] == rec_item['gender']) or \
                      (query_item['gender'] == 'unisex') or \
                      (rec_item['gender'] == 'unisex')
            gender_matches.append(g_match)
            
            # Other attributes
            color_matches.append(query_item['baseColour'] == rec_item['baseColour'])
            brand_matches.append(query_item['brand'] == rec_item['brand'])
            usage_matches.append(query_item['usage'] == rec_item['usage'])
            season_matches.append(query_item['season'] == rec_item['season'])
            
    # Compute final metrics
    mean_article_type = np.mean(article_type_matches) * 100
    mean_sub_category = np.mean(sub_category_matches) * 100
    mean_gender = np.mean(gender_matches) * 100
    mean_color = np.mean(color_matches) * 100
    mean_brand = np.mean(brand_matches) * 100
    mean_usage = np.mean(usage_matches) * 100
    mean_season = np.mean(season_matches) * 100
    
    # Combined attribute overlap score
    # Count how many of: articleType, gender, baseColour, brand, usage, season match
    total_attributes_checked = 6
    overlap_score = (
        np.array(article_type_matches).astype(int) +
        np.array(gender_matches).astype(int) +
        np.array(color_matches).astype(int) +
        np.array(brand_matches).astype(int) +
        np.array(usage_matches).astype(int) +
        np.array(season_matches).astype(int)
    ) / total_attributes_checked * 100
    mean_overlap = np.mean(overlap_score)
    
    print("\nEvaluation Results (Average top-10 consistency):")
    print(f"  Gender Consistency:           {mean_gender:.2f}% (Matches query gender or unisex)")
    print(f"  Sub-Category Consistency:     {mean_sub_category:.2f}% (e.g. both are Topwear)")
    print(f"  Article Type Consistency:     {mean_article_type:.2f}% (e.g. both are Shirts)")
    print(f"  Usage Consistency:            {mean_usage:.2f}% (e.g. both are Casual)")
    print(f"  Colour Consistency:           {mean_color:.2f}%")
    print(f"  Brand Consistency:            {mean_brand:.2f}%")
    print(f"  Season Consistency:           {mean_season:.2f}%")
    print(f"  -----------------------------------------------")
    print(f"  Overall Attribute Overlap:    {mean_overlap:.2f}% (Average matching attributes)")
    print("--- Evaluation Complete ---\n")

if __name__ == "__main__":
    cleaned_path = os.path.join("data", "cleaned_styles.csv")
    models_path = os.path.join("models")
    evaluate_recommender(cleaned_path, models_path)
