import pandas as pd
import os

def check_new_students_no_header():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        target_sheet = xls.sheet_names[-1]
        print(f"Target sheet: {target_sheet}")
        df = pd.read_excel(ods_path, sheet_name=target_sheet, engine='odf', header=None, nrows=10)
        for i, row in df.iterrows():
            print(f"Row {i}: {row.tolist()}")

if __name__ == "__main__":
    check_new_students_no_header()
