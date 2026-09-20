# Mineral Emissions Intensity Calculation  2015–2024 
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from scipy.stats import pearsonr, spearmanr

file_path = r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\Minerals_Emission_GDP_Population_Master_Sheet.xlsx"
df = pd.read_excel(file_path)

df.columns = df.columns.str.strip()

country_col = "Country Name"
year_col = "start_time"
emissions_col = "Emssion_qty_avg_replaced"
gdp_pc_col = "GDP per capita (current US$)"
population_col = "Population"
mineral_col = "subsector"

# Convert to numeric
df[year_col] = pd.to_numeric(df[year_col], errors="coerce")
df[emissions_col] = pd.to_numeric(df[emissions_col], errors="coerce")
df[gdp_pc_col] = pd.to_numeric(df[gdp_pc_col], errors="coerce")
df[population_col] = pd.to_numeric(df[population_col], errors="coerce")

df = df.dropna(subset=[country_col, year_col, emissions_col, gdp_pc_col, population_col])

# Total GDP
df["Total_GDP"] = df[gdp_pc_col] * df[population_col]

# Avoid division by zero
df = df[(df[gdp_pc_col] > 0) & (df[population_col] > 0)]

# Emissions Intensity (как ты просила — делим на GDP per capita)
df["Emissions_Intensity"] = df[emissions_col] / df[gdp_pc_col]
df["Emissions_Intensity"] = df["Emissions_Intensity"].replace([np.inf, -np.inf], np.nan)

# Emissions per capita
df["Emissions_per_capita"] = df[emissions_col] / df[population_col]
df["Emissions_per_capita"] = df["Emissions_per_capita"].replace([np.inf, -np.inf], np.nan)


df_2015_2024 = df[(df[year_col] >= 2015) & (df[year_col] <= 2024)]

avg_intensity = (
    df_2015_2024
    .groupby(country_col)["Emissions_Intensity"]
    .mean()
    .reset_index()
    .rename(columns={"Emissions_Intensity": "Avg_Intensity_2015_2024"})
)

df = df.merge(avg_intensity, on=country_col, how="left")


df = df[(df["Emissions_Intensity"] > 0) & (df[gdp_pc_col] > 0)]

df["log_GDP_pc"] = np.log(df[gdp_pc_col])
df["log_Emissions_Intensity"] = np.log(df["Emissions_Intensity"])
df["log_Emissions_per_capita"] = np.log(df["Emissions_per_capita"] + 1e-10)



plt.figure()
plt.hist(df[gdp_pc_col], bins=30)
plt.title("Distribution of GDP per capita")
plt.xlabel("GDP per capita")
plt.ylabel("Frequency")
plt.savefig(r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\gdp_distribution.png", dpi=300, bbox_inches="tight")
plt.show()

plt.figure()
plt.hist(df["Emissions_Intensity"], bins=30)
plt.title("Distribution of Emissions Intensity")
plt.xlabel("Emissions Intensity")
plt.ylabel("Frequency")
plt.savefig(r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\gdp_distribution.png", dpi=300, bbox_inches="tight")
plt.show()


plt.figure()
plt.hist(df["Emissions_per_capita"], bins=30)
plt.title("Distribution of Emissions per capita")
plt.xlabel("Emissions per capita")
plt.ylabel("Frequency")
plt.savefig(r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\gdp_distribution.png", dpi=300, bbox_inches="tight")
plt.show()


mineral_avg = (
    df_2015_2024
    .groupby(mineral_col)["Emissions_Intensity"]
    .mean()
    .reset_index()
)

plt.figure()
plt.bar(mineral_avg[mineral_col], mineral_avg["Emissions_Intensity"])
plt.title("Average Emissions Intensity per Mineral (2015–2024)")
plt.xlabel("Mineral")
plt.ylabel("Average Emissions Intensity")
plt.xticks(rotation=45)
plt.savefig(r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\gdp_distribution.png", dpi=300, bbox_inches="tight")
plt.show()



print("\n=== CORRELATION ANALYSIS ===")

# Overall
pearson_all, p_all = pearsonr(df["log_GDP_pc"], df["log_Emissions_Intensity"])
spearman_all, sp_p_all = spearmanr(df["log_GDP_pc"], df["log_Emissions_Intensity"])

print("\nOverall (all minerals pooled)")
print("Pearson r:", pearson_all)
print("Spearman rho:", spearman_all)

# Per mineral
minerals = df[mineral_col].unique()

for mineral in minerals:
    subset = df[df[mineral_col] == mineral]
    
    if len(subset) > 5:
        pr, _ = pearsonr(subset["log_GDP_pc"], subset["log_Emissions_Intensity"])
        sr, _ = spearmanr(subset["log_GDP_pc"], subset["log_Emissions_Intensity"])
        
        print(f"\n{mineral}")
        print("Pearson r:", pr)
        print("Spearman rho:", sr)

plt.figure()
plt.scatter(df["log_GDP_pc"], df["log_Emissions_Intensity"])
plt.title("Scatter: log GDP vs log Intensity")
plt.xlabel("log GDP per capita")
plt.ylabel("log Emissions Intensity")
plt.savefig(r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\gdp_distribution.png", dpi=300, bbox_inches="tight")
plt.show()



output_csv = r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\Minerals_With_Intensity_2015_2024.csv"
output_excel = r"C:\Users\marin\Desktop\HW Semester 2\DataVis\group project\Minerals_With_Intensity_2015_2024.xlsx"

df.to_csv(output_csv, index=False)
df.to_excel(output_excel, index=False)

print("\nCalculation complete.")