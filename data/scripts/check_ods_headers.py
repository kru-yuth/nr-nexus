import pandas as pd
import os

def check_headers():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        for sheet in xls.sheet_names:
            # Read row index 1 (which is the 2nd row)
            df = pd.read_excel(ods_path, sheet_name=sheet, engine='odf', header=None, nrows=2)
            print(f"\nSheet: {sheet}")
            print(f"Row 1 content: {df.iloc[1].tolist()}")

if __name__ == "__main__":
    check_headers()
