import pandas as pd

df = pd.read_csv('data/processed/golden_master_clean.csv', encoding='utf-8-sig')

missing_prefix = df[df['prefix'].isna() | (df['prefix'] == "")]
missing_level = df[df['level'].isna() | (df['level'] == "")]
missing_class = df[df['class'].isna() | (df['class'] == "")]
missing_gender = df[df['gender'].isna() | (df['gender'] == "")]

print(f"Total records: {len(df)}")
print(f"Missing prefix: {len(missing_prefix)}")
print(f"Missing level: {len(missing_level)}")
print(f"Missing class: {len(missing_class)}")
print(f"Missing gender: {len(missing_gender)}")

if len(missing_prefix) > 0:
    print("\nSample missing prefix:")
    print(missing_prefix[['studentId', 'firstName', 'lastName', 'level', 'class']].head())

if len(missing_level) > 0:
    print("\nSample missing level/class/gender:")
    print(missing_level[['studentId', 'firstName', 'lastName', 'prefix', 'gender', 'level', 'class']].head())
