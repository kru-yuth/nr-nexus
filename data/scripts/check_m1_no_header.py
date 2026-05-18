import pandas as pd
import os

def check_m1_no_header():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        target_sheet = [s for s in xls.sheet_names if '1' in s and 'ม' in s][0]
        print(f"Target sheet: {target_sheet}")
        df = pd.read_excel(ods_path, sheet_name=target_sheet, engine='odf', header=None, nrows=10)
        for i, row in df.iterrows():
            print(f"Row {i}: {row.tolist()}")

if __name__ == "__main__":
    check_m1_no_header()
