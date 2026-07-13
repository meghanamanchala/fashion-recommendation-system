import os
import pandas as pd
import numpy as np

def perform_eda(input_csv: str, output_csv: str):
    """
    Loads the fashion dataset, cleans it by handling missing values and duplicates,
    performs EDA, and saves the cleaned dataset.
    """
    print("--- Starting Exploratory Data Analysis & Cleaning ---")
    
    # 1. Load Dataset
    if not os.path.exists(input_csv):
        raise FileNotFoundError(f"Source CSV not found at: {input_csv}")
    
    print(f"Loading dataset from: {input_csv}")
    # Using on_bad_lines='skip' to gracefully handle malformed lines (unescaped commas)
    df = pd.read_csv(input_csv, on_bad_lines='skip')
    initial_shape = df.shape
    print(f"Initial Dataset Shape: {initial_shape[0]} rows, {initial_shape[1]} columns")
    
    # 2. Handle Duplicates
    duplicates_count = df.duplicated().sum()
    print(f"Number of duplicate rows: {duplicates_count}")
    if duplicates_count > 0:
        df.drop_duplicates(inplace=True)
        print(f"Removed {duplicates_count} duplicate rows. New shape: {df.shape}")
    else:
        print("No duplicate rows found.")
        
    # 3. Handle Missing Values
    print("\nMissing values per column before cleaning:")
    missing_info = df.isnull().sum()
    for col, count in missing_info.items():
        if count > 0:
            print(f"  {col}: {count} missing values")
            
    # Fill missing values
    # For categorical columns, we fill missing values with 'Unknown'
    fill_unknown_cols = ['baseColour', 'season', 'usage', 'productDisplayName']
    for col in fill_unknown_cols:
        if col in df.columns:
            df[col] = df[col].fillna('Unknown')
            
    # Year has very few missing, let's fill it with mode or median
    if 'year' in df.columns:
        year_mode = df['year'].mode()[0] if not df['year'].mode().empty else 2012
        df['year'] = df['year'].fillna(year_mode).astype(int)
        
    print("\nMissing values after cleaning:")
    print(df.isnull().sum())
    
    # 4. Exploratory Analysis Insights
    print("\n--- EDA Summary & Distributions ---")
    print(f"Total records: {len(df)}")
    
    print("\n1. Gender Distribution:")
    gender_counts = df['gender'].value_counts()
    for gender, val in gender_counts.items():
        pct = (val / len(df)) * 100
        print(f"  {gender:10s}: {val:6d} ({pct:.2f}%)")
        
    print("\n2. Master Category Distribution:")
    master_cat_counts = df['masterCategory'].value_counts()
    for cat, val in master_cat_counts.items():
        pct = (val / len(df)) * 100
        print(f"  {cat:20s}: {val:6d} ({pct:.2f}%)")
        
    print("\n3. Top 15 Sub-Categories:")
    sub_cat_counts = df['subCategory'].value_counts().head(15)
    for cat, val in sub_cat_counts.items():
        print(f"  {cat:25s}: {val:6d}")

    print("\n4. Top 15 Product/Article Types:")
    article_counts = df['articleType'].value_counts().head(15)
    for art, val in article_counts.items():
        print(f"  {art:25s}: {val:6d}")
        
    print("\n5. Season Distribution:")
    season_counts = df['season'].value_counts()
    for season, val in season_counts.items():
        print(f"  {season:12s}: {val:6d}")
        
    print("\n6. Usage Distribution:")
    usage_counts = df['usage'].value_counts()
    for usage, val in usage_counts.items():
        print(f"  {usage:15s}: {val:6d}")
        
    # Save cleaned data
    os.makedirs(os.path.dirname(output_csv), exist_ok=True)
    df.to_csv(output_csv, index=False)
    print(f"\nCleaned dataset saved successfully to: {output_csv}")
    print("--- EDA & Cleaning Complete ---\n")

if __name__ == "__main__":
    raw_path = os.path.join("data", "styles.csv")
    cleaned_path = os.path.join("data", "cleaned_styles.csv")
    perform_eda(raw_path, cleaned_path)
