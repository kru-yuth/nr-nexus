import pandas as pd
import os

def find_header_row():
    ods_path = 'data/raw/รายชื่อนักเรียน1-2569.ods'
    with pd.ExcelFile(ods_path, engine='odf') as xls:
        for sheet in xls.sheet_names:
            df = pd.read_excel(ods_path, sheet_name=sheet, engine='odf', header=None, nrows=10)
            found_idx = -1
            for i, row in df.iterrows():
                row_str = str(row.tolist())
                if 'เน€เธฅเธเธธฃเธฐเธเธณเธ•เธฑเธง' in row_str or 'เน€เธฅเธเธธ' in row_str:
                    found_idx = i
                    break
            print(f"Sheet: {sheet} | Header Row Index found at: {found_idx}")

if __name__ == "__main__":
    find_header_row()
