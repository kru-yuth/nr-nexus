import pandas as pd
import os

def inspect_ods():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    if not os.path.exists(ods_path):
        print(f"Error: {ods_path} not found")
        return

    # Load the ODS file
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        sheet_names = xls.sheet_names
        print(f"Sheet names: {sheet_names}")
        
        for sheet in sheet_names:
            print(f"\n--- Sheet: {sheet} ---")
            # Read first 5 rows to see structure
            df = pd.read_excel(ods_path, sheet_name=sheet, engine='odf', nrows=5)
            print(df.to_string())

if __name__ == "__main__":
    inspect_ods()
