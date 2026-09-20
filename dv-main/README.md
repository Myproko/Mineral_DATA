# Mining Dashboard: Mineral Extraction & Economic Development (2015–2024)

## OVERVIEW
This project presents an interactive data visualization dashboard that explores the relationship between mineral extraction and economic development between 2015 and 2024.

The analysis focuses on three key minerals:
- Bauxite  
- Copper  
- Iron  

Due to limited availability of direct production data, emissions intensity is used as a proxy to assess mining activity and efficiency across countries.

---

## AIM OF THE PROJECT
The aim of this project is to investigate how mining activity relates to economic development and to identify patterns in emissions efficiency across different countries and mineral types.

---

## DASHBOARD DESIGN
The dashboard is structured as a data-driven narrative, where each visualization answers a specific part of the research question:

- **Distribution**  Histogram shows how emissions intensity is spread  
- **Comparison**  Bar chart compares emissions across minerals  
- **Relationship**  Bubble chart explores GDP vs emissions  
- **Geography**  Map highlights global emission patterns  

This structure allows users to move from understanding *what is happening* to *why it is happening* and *where action is needed*.

---

## VISUALIZATION

### Histogram
Displays the distribution of emissions intensity.  
The data is highly right-skewed, indicating that most countries operate at low intensity while a small number exhibit significantly higher values.

### Bar Chart
Shows the average emissions intensity by mineral type.  
Copper mining has the highest emissions intensity, followed by iron and bauxite.

### Bubble Chart
Explores the relationship between GDP per capita and emissions intensity.  
- Log scales are used to handle wide data ranges  
- Bubble size represents total emissions  
- Pearson correlation coefficients are included  

The results indicate a negative relationship, suggesting that higher-income countries tend to have lower emissions intensity.

### Map (Choropleth)
Provides geographic context by visualizing emissions across countries.  
Emissions are concentrated in major economies such as China and India, while some lower-income regions also show high emissions, indicating inefficiencies in extraction.

---

## INTERACTIVITY
The dashboard includes interactive filtering features:
- Year selection  
- Mineral selection  
- Reset functionality  

All visualizations update dynamically based on the selected filters, ensuring consistency and enabling deeper exploration of the data.

---

## TECHNICAL IMPLEMENTATION
The dashboard is implemented using:
- **D3.js (v7)** for data visualization  
- **HTML, CSS, and JavaScript** for structure and styling  
- **GeoJSON** for rendering the world map  

A centralized state management approach is used, where selected filters are stored and applied across all visual components to maintain synchronization.

---

## PROJECT STRUCTURE
- `index.html` → Main dashboard layout  
- `scripts/dashboard.js` → All visualization logic and interactions  
- `styles/style.css` → Styling and layout  
- `data/` → Datasets used for analysis  

---

## LIMITATION
- Emissions intensity is used as a proxy and may not fully represent actual production levels  
- Country-level aggregation may mask regional variations  
- The map reflects total emissions and should be interpreted alongside other visualizations  


##  CONCLUSION
This project demonstrates how interactive visualization can be used to explore complex relationships between economic development and environmental impact.  
It highlights that emissions are influenced not only by the scale of production but also by the efficiency of extraction processes.Libraries other than D3.js can be authorised by your lecturer. 

If you use them, copy them here, ideally as a minified script, along with the library's License information.
