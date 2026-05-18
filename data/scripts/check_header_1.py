import pandas as pd
import os

def check_header_1():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        for sheet in xls.sheet_names:
            df = pd.read_excel(ods_path, sheet_name=sheet, engine='odf', header=1, nrows=2)
            print(f"\nSheet: {sheet}")
            print(f"Columns: {df.columns.tolist()}")

if __name__ == "__main__":
    check_header_1()
