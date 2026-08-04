import pandas as pd

df = pd.read_excel('assets/template.xlsx', header=None)
print(df.head(20).to_string())
