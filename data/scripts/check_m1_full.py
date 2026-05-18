import pandas as pd
import os

def check_m1_full():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        target_sheet = xls.sheet_names[0]
        df = pd.read_excel(ods_path, sheet_name=target_sheet, engine='odf', header=None)
        print(f"Total rows in {target_sheet}: {len(df)}")
        for i, row in df.iterrows():
            row_str = str(row.tolist())
            if '/2' in row_str or '2569' in row_str:
                 print(f"Row {i}: {row_str}")

if __name__ == "__main__":
    check_m1_full()
