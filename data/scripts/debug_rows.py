import pandas as pd
import os

def debug_rows():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        sheet = xls.sheet_names[0]
        df = pd.read_excel(ods_path, sheet_name=sheet, engine='odf', header=None, nrows=5)
        print(f"Sheet: {sheet}")
        for i in range(len(df)):
            print(f"Row {i} type: {[type(x) for x in df.iloc[i]]}")
            print(f"Row {i} values: {df.iloc[i].tolist()}")

if __name__ == "__main__":
    debug_rows()
