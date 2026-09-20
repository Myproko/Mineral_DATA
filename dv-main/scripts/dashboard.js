// js/dashboard.js
// we tried to keep everything in one file so we are not chasing bugs across multiple scripts

// Team contributions:
// Marina -> Lines in BubbleChart / correlation over time (2015-2024)
// Marina -> Bar Chart / average emission intensity by mineral
// Ruqaiya -> Choropleth map and filters
// Nokutenda -> Histogram
// Nokutenda -> Log-log scatterplot
// Afzal Patel -> Bubble chart

"use strict";

const MAIN_CSV = "data/Minerals_With_Intensity_2015_2024.csv";
const MAP_GEOJSON = "data/world.geojson";
const MAP_CSV = "data/maps_new_data.csv";

const DEFAULT_YEAR = "2021";
const DEFAULT_MINERAL = "all";

const MINERAL_COLORS = {
    "bauxite-mining": "#38bdf8",
    "copper-mining": "#fb923c",
    "iron-mining": "#4ade80"
};

const MINERAL_LABELS = {
    "bauxite-mining": "Bauxite Mining",
    "copper-mining": "Copper Mining",
    "iron-mining": "Iron Mining"
};


// small helper functions used across the dashboard

function normalizeMineral(value) {
    return (value || "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "-");
}

function parseMainRow(d) {
    return {
        country: (d["Country Name"] || "").trim(),
        year: String(d.start_time || "").trim(),
        mineral: normalizeMineral(d.subsector),
        gdp: +d["GDP per capita (current US$)"],
        intensity: +d["Emissions_Intensity"],
        emPerCapita: +d["Emissions_per_capita"],
        emissions: +d["emissions_quantity"],
        population: +d["Population"]
    };
}

function isValidMainRow(d) {
    return (
        d.year &&
        d.gdp > 0 &&
        d.intensity > 0 &&
        d.emPerCapita > 0 &&
        d.emissions > 0 &&
        d.population > 0 &&
        !isNaN(d.gdp) &&
        !isNaN(d.intensity) &&
        !isNaN(d.emPerCapita) &&
        !isNaN(d.emissions) &&
        !isNaN(d.population)
    );
}

function fmtGDP(value) {
    if (value >= 1e6) return "$" + (value / 1e6).toFixed(0) + "M";
    if (value >= 1e3) return "$" + (value / 1e3).toFixed(0) + "k";
    return "$" + value.toFixed(0);
}

function fmtEmissionsPerCapita(value) {
    if (value >= 1) return value.toFixed(2);
    if (value >= 0.01) return value.toFixed(4);
    return value.toExponential(2);
}

function fmtEmissionsQuantity(value) {
    if (value >= 1e6) return (value / 1e6).toFixed(2) + "M t";
    if (value >= 1e3) return (value / 1e3).toFixed(1) + "k t";
    return value.toFixed(0) + " t";
}

function getFilteredData(data, year, mineral) {
    return data.filter(d => {
        const yearMatch = year === "all" || d.year === String(year);
        const mineralMatch = mineral === "all" || d.mineral === mineral;
        return yearMatch && mineralMatch;
    });
}

function getPearsonLogCorrelation(data, xKey, yKey) {
    if (!data || data.length < 2) return null;

    const xs = data.map(d => Math.log10(d[xKey]));
    const ys = data.map(d => Math.log10(d[yKey]));

    const xMean = d3.mean(xs);
    const yMean = d3.mean(ys);

    const numerator = d3.sum(xs.map((x, i) => (x - xMean) * (ys[i] - yMean)));
    const denominatorX = Math.sqrt(d3.sum(xs.map(x => (x - xMean) ** 2)));
    const denominatorY = Math.sqrt(d3.sum(ys.map(y => (y - yMean) ** 2)));

    if (!denominatorX || !denominatorY) return null;

    return numerator / (denominatorX * denominatorY);
}

function getLogTicks(scale, maxCount) {
    const [lo, hi] = scale.domain();
    const ticks = [];

    let value = Math.pow(10, Math.floor(Math.log10(lo)));
    while (value <= hi * 1.01) {
        if (value >= lo * 0.99) {
            ticks.push(value);
        }
        value *= 10;
    }

    if (ticks.length >= 3) {
        return ticks.slice(0, maxCount);
    }

    const fallback = [];
    let base = Math.pow(10, Math.floor(Math.log10(lo)));

    while (base <= hi * 1.01) {
        [1, 2, 5].forEach(multiplier => {
            const candidate = base * multiplier;
            if (candidate >= lo * 0.99 && candidate <= hi * 1.01) {
                fallback.push(candidate);
            }
        });
        base *= 10;
    }

    return fallback.slice(0, maxCount);
}


// This is the bubble chart section worked on by Afzal Patel and Marina 

let bubbleTooltip = null;

function initBubbleTooltip() {
    bubbleTooltip = d3.select("#tooltip");

    bubbleTooltip
        .style("position", "fixed")
        .style("display", "none")
        .style("pointer-events", "none")
        .style("z-index", "99999");
}

function updateBubbleChart(data, year, mineral) {
    if (!bubbleTooltip) {
        initBubbleTooltip();
    }

    const container = d3.select("#bubbleChart");
    container.selectAll("*").remove();

    const filtered = getFilteredData(data, year, mineral);

    if (!filtered.length) {
        container
            .append("p")
            .style("padding", "24px")
            .style("color", "#6b7280")
            .text("No data available for this selection.");
        return;
    }

    const activeMinerals = mineral === "all"
        ? Object.keys(MINERAL_COLORS)
        : [mineral];

    const headerRow = container.append("div")
        .style("display", "flex")
        .style("justify-content", "space-between")
        .style("align-items", "flex-start")
        .style("gap", "60px")
        .style("margin-bottom", "18px")
        .style("flex-wrap", "wrap");

    container.append("p")
        .attr("class", "bc-subtitle")
        .style("margin", "6px 0 20px")
        .style("font-size", "12px")
        .style("color", "#6b7280")
        .style("text-align", "center")
        .style("width", "100%")
        .text(`Bubble size = total emissions · Year: ${year === "all" ? "All Years" : year} · ${filtered.length} data points`);

    const rightBlock = headerRow.append("div")
        .style("display", "flex")
        .style("flex-direction", "column")
        .style("width", "48%");

    rightBlock.append("p")
        .style("margin", "0 0 18px")
        .style("font-size", "14px")
        .style("font-weight", "600")
        .style("color", "#1f2937")
        .text("Pearson correlation coefficients: Emissions Intensity vs GDP per Capita");

    const rightBadges = rightBlock.append("div")
        .style("display", "flex")
        .style("gap", "12px")
        .style("flex-wrap", "wrap");

    activeMinerals.forEach(m => {
        const subset = filtered.filter(d => d.mineral === m);
        const rIntensity = getPearsonLogCorrelation(subset, "gdp", "intensity");

        if (rIntensity === null) return;

        const badge = rightBadges.append("div")
            .style("display", "flex")
            .style("align-items", "center")
            .style("gap", "8px")
            .style("background", "#ffffff")
            .style("border", "1px solid #6b7280")
            .style("border-radius", "10px")
            .style("padding", "8px 14px")
            .style("font-size", "12px")
            .style("color", "#374151");

        badge.append("span")
            .style("width", "8px")
            .style("height", "8px")
            .style("border-radius", "50%")
            .style("display", "inline-block")
            .style("background", MINERAL_COLORS[m]);

        badge.append("span")
            .text(`${MINERAL_LABELS[m]} r = ${rIntensity.toFixed(3)}`);
    });

    const containerNode = container.node();
    const parentWidth = containerNode.parentElement
        ? containerNode.parentElement.clientWidth
        : containerNode.clientWidth;

    const width = Math.max(parentWidth - 10, 900);
    const height = 500;

    const margin = {
        top: 20,
        right: 20,
        bottom: 70,
        left: 75
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = container
        .append("svg")
        .attr("width", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");

    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const xMin = d3.min(filtered, d => d.gdp) * 0.75;
    const xMax = d3.max(filtered, d => d.gdp) * 1.35;
    const yMin = Math.max(d3.min(filtered, d => d.emPerCapita) * 0.75, 1e-8);
    const yMax = d3.max(filtered, d => d.emPerCapita) * 1.35;

    const xScale = d3.scaleLog()
        .domain([xMin, xMax])
        .range([0, innerWidth]);

    const yScale = d3.scaleLog()
        .domain([yMin, yMax])
        .range([innerHeight, 0]);

    const sizeScale = d3.scaleSqrt()
        .domain(d3.extent(filtered, d => d.emissions))
        .range([6, 36]);

    const xTicks = getLogTicks(xScale, 7);
    const yTicks = getLogTicks(yScale, 7);

    chart.append("g")
        .selectAll("line.x-grid")
        .data(xTicks)
        .join("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", innerHeight)
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);

    chart.append("g")
        .selectAll("line.y-grid")
        .data(yTicks)
        .join("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", d => yScale(d))
        .attr("y2", d => yScale(d))
        .attr("stroke", "#e5e7eb")
        .attr("stroke-width", 1);

    chart.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
            d3.axisBottom(xScale)
                .tickValues(xTicks)
                .tickFormat(fmtGDP)
        )
        .selectAll("text")
        .attr("font-size", "12px")
        .attr("font-weight", "500");

    chart.append("g")
        .call(
            d3.axisLeft(yScale)
                .tickValues(yTicks)
                .tickFormat(d => {
                    if (d >= 1) return d.toFixed(1);
                    if (d >= 0.01) return d.toFixed(3);
                    return d.toExponential(1);
                })
        )
        .selectAll("text")
        .attr("font-size", "12px")
        .attr("font-weight", "500");

    chart.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 55)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .text("GDP per Capita (USD) — log scale");

    chart.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -(innerHeight / 2))
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "600")
        .text("Emissions per Capita (tonnes CO₂e) — log scale");

    const sorted = [...filtered].sort((a, b) => b.emissions - a.emissions);

    const bubbles = chart.selectAll("circle.bubble")
        .data(sorted)
        .join("circle")
        .attr("class", "bubble")
        .attr("cx", d => xScale(d.gdp))
        .attr("cy", d => yScale(Math.max(yMin, Math.min(yMax, d.emPerCapita))))
        .attr("r", 0)
        .attr("fill", d => (MINERAL_COLORS[d.mineral] || "#94a3b8") + "66")
        .attr("stroke", d => MINERAL_COLORS[d.mineral] || "#94a3b8")
        .attr("stroke-width", 1)
        .style("cursor", "pointer");

    bubbles.transition()
        .duration(400)
        .attr("r", d => sizeScale(d.emissions));

    bubbles
        .on("mouseover", function(event, d) {
            d3.select(this)
                .raise()
                .attr("fill", (MINERAL_COLORS[d.mineral] || "#94a3b8") + "cc")
                .attr("stroke-width", 2);

            bubbleTooltip
                .style("display", "block")
                .style("left", `${event.clientX + 12}px`)
                .style("top", `${event.clientY + 12}px`)
                .html(`
                    <div class="tt-title">${d.country}</div>
                    <div class="tt-row"><span>Mineral</span><span>${d.mineral.replace(/-/g, " ")}</span></div>
                    <div class="tt-row"><span>Year</span><span>${d.year}</span></div>
                    <div class="tt-row"><span>GDP per capita</span><span>$${Math.round(d.gdp).toLocaleString("en-US")}</span></div>
                    <div class="tt-row"><span>Emissions per capita</span><span>${fmtEmissionsPerCapita(d.emPerCapita)} t</span></div>
                    <div class="tt-row"><span>Total emissions</span><span>${fmtEmissionsQuantity(d.emissions)}</span></div>
                    <div class="tt-row"><span>Population</span><span>${d.population.toLocaleString("en-US")}</span></div>
                `);
        })
        .on("mousemove", function(event) {
            bubbleTooltip
                .style("left", `${event.clientX + 12}px`)
                .style("top", `${event.clientY + 12}px`);
        })
        .on("mouseout", function(event, d) {
            d3.select(this)
                .attr("fill", (MINERAL_COLORS[d.mineral] || "#94a3b8") + "66")
                .attr("stroke-width", 1);

            bubbleTooltip.style("display", "none");
        });
}


// This is the histogram section worked on by Nokutenda

class HistogramChart {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
        this.data = [];
    }

    setData(data) {
        this.data = data;
    }

    render(year, mineral) {
        const filtered = getFilteredData(this.data, year, mineral);
        this.container.selectAll("*").remove();

        if (!filtered.length) return;

        const containerNode = this.container.node();
        const width = Math.max(containerNode.clientWidth || 700, 520);
        const height = 420;
        const margin = { top: 40, right: 30, bottom: 70, left: 70 };

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = this.container
            .append("svg")
            .attr("width", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const values = filtered.map(d => d.intensity);
        const sortedValues = [...values].sort((a, b) => a - b);
        const xMax = d3.quantile(sortedValues, 0.95);

        const xScale = d3.scaleLinear()
            .domain([0, xMax])
            .nice()
            .range([0, innerWidth]);

        const bins = d3.bin()
            .domain(xScale.domain())
            .thresholds(20)(values.filter(v => v <= xMax));

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, d => d.length)])
            .nice()
            .range([innerHeight, 0]);

        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("font-size", "12px")
            .attr("font-weight", "500");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .attr("font-size", "12px")
            .attr("font-weight", "500");

        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 50)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "600")
            .text("Emissions Intensity");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -50)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "600")
            .text("Frequency");

        svg.selectAll("rect.hist-bar")
            .data(bins)
            .join("rect")
            .attr("class", "hist-bar")
            .attr("x", d => xScale(d.x0))
            .attr("width", d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("fill", "#69b3a2")
            .transition()
            .duration(500)
            .attr("y", d => yScale(d.length))
            .attr("height", d => innerHeight - yScale(d.length));
    }
}


// This is the bar chart section worked on by Marina

class BarChart {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
        this.data = [];
    }

    setData(data) {
        this.data = data;
    }

    render(year, mineral) {
        const filtered = getFilteredData(this.data, year, mineral);
        this.container.selectAll("*").remove();

        if (!filtered.length) return;

        const containerNode = this.container.node();
        const width = Math.max(containerNode.clientWidth || 700, 520);
        const height = 420;
        const margin = { top: 40, right: 30, bottom: 80, left: 80 };

        const innerWidth = width - margin.left - margin.right;
        const innerHeight = height - margin.top - margin.bottom;

        const svg = this.container
            .append("svg")
            .attr("width", "100%")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const grouped = Array.from(
            d3.rollup(
                filtered,
                values => d3.mean(values, d => d.intensity),
                d => d.mineral
            ),
            ([mineralName, avgIntensity]) => ({
                mineral: mineralName,
                avgIntensity
            })
        );

        const xScale = d3.scaleBand()
            .domain(grouped.map(d => d.mineral))
            .range([0, innerWidth])
            .padding(0.3);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(grouped, d => d.avgIntensity)])
            .nice()
            .range([innerHeight, 0]);

        svg.selectAll("rect.bar-mark")
            .data(grouped, d => d.mineral)
            .join("rect")
            .attr("class", "bar-mark")
            .attr("x", d => xScale(d.mineral))
            .attr("width", xScale.bandwidth())
            .attr("y", innerHeight)
            .attr("height", 0)
            .attr("fill", d => MINERAL_COLORS[d.mineral] || "#999")
            .transition()
            .duration(500)
            .attr("y", d => yScale(d.avgIntensity))
            .attr("height", d => innerHeight - yScale(d.avgIntensity));

        svg.append("g")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(d3.axisBottom(xScale))
            .selectAll("text")
            .attr("font-size", "12px")
            .attr("font-weight", "500");

        svg.append("g")
            .call(d3.axisLeft(yScale))
            .selectAll("text")
            .attr("font-size", "12px")
            .attr("font-weight", "500");

        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight + 56)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "600")
            .text("Mineral Type");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -innerHeight / 2)
            .attr("y", -58)
            .attr("text-anchor", "middle")
            .attr("font-size", "14px")
            .attr("font-weight", "600")
            .text("Average Emission Intensity");
    }
}


// This is the map section worked on by Ruqaiya

class MapChart {
    constructor(containerSelector) {
        this.container = d3.select(containerSelector);
        this.geoData = null;
        this.csvData = [];
        this.tooltip = d3.select("#tooltip");
    }

    setData(geoData, csvData) {
        this.geoData = geoData;
        this.csvData = csvData;
    }

    render() {
        if (!this.geoData || !this.csvData.length) return;

        const width = 1200;
        const height = 700;

        const svg = this.container
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("display", "block");

        svg.selectAll("*").remove();

        const projection = d3.geoNaturalEarth1()
            .scale(240)
            .translate([width / 2, height / 2]);

        const path = d3.geoPath().projection(projection);

        const emissionsByCountry = {};

        this.csvData.forEach(d => {
            const country = d.Country ? d.Country.trim() : null;
            const emissions = +d.Emissions;

            if (country && !isNaN(emissions)) {
                emissionsByCountry[country] = emissions;
            }
        });

        const maxEmission = d3.max(Object.values(emissionsByCountry)) || 1;

        const colorScale = d3.scaleQuantize()
            .domain([0, maxEmission])
            .range(d3.schemeGreens[7]);

        svg.selectAll("path.country")
            .data(this.geoData.features)
            .join("path")
            .attr("class", "country")
            .attr("d", path)
            .attr("stroke", "#666")
            .attr("stroke-width", 0.7)
            .attr("fill", d => {
                const value = emissionsByCountry[d.properties.name];
                return value !== undefined ? colorScale(value) : "#e5e7eb";
            })
            .style("cursor", "pointer")
            .on("mouseover", (event, d) => {
                const countryName = d.properties.name;
                const value = emissionsByCountry[countryName];

                d3.select(event.currentTarget)
                    .attr("stroke", "#1f2937")
                    .attr("stroke-width", 1.2);

                this.tooltip
                    .style("display", "block")
                    .html(`
                        <div class="tt-title">${countryName}</div>
                        <div class="tt-row">
                            <span>Emissions</span>
                            <span>${value !== undefined ? value.toFixed(2) : "No data"}</span>
                        </div>
                    `);
            })
            .on("mousemove", event => {
                this.tooltip
                    .style("left", `${event.clientX + 12}px`)
                    .style("top", `${event.clientY + 12}px`);
            })
            .on("mouseout", event => {
                d3.select(event.currentTarget)
                    .attr("stroke", "#666")
                    .attr("stroke-width", 0.7);

                this.tooltip.style("display", "none");
            });
    }
}


// This is the main dashboard controller section that connects all the charts together

class DashboardApp {
    constructor() {
        this.data = [];
        this.mapGeoData = null;
        this.mapCsvData = [];

        this.filters = {
            year: DEFAULT_YEAR,
            mineral: DEFAULT_MINERAL
        };

        this.histogramChart = new HistogramChart("#histogram");
        this.barChart = new BarChart("#bar-chart");
        this.mapChart = new MapChart("#map");
    }

    async init() {
        initBubbleTooltip();
        await this.loadData();
        this.initControls();
        this.updateCharts();
    }

    async loadData() {
        try {
            const [mainData, geoData, mapData] = await Promise.all([
                d3.csv(MAIN_CSV, parseMainRow),
                d3.json(MAP_GEOJSON),
                d3.csv(MAP_CSV)
            ]);

            console.log("main data loaded:", mainData.length);
            console.log("first row:", mainData[0]);

            this.data = mainData.filter(isValidMainRow);

            console.log("rows after filter:", this.data.length);

            this.mapGeoData = geoData;
            this.mapCsvData = mapData;

            this.histogramChart.setData(this.data);
            this.barChart.setData(this.data);
            this.mapChart.setData(this.mapGeoData, this.mapCsvData);
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        }
    }

    initControls() {
        const yearSelect = document.getElementById("year-filter");
        const mineralSelect = document.getElementById("mineral-filter");
        const resetBtn = document.getElementById("reset-btn");

        if (yearSelect && yearSelect.options.length <= 1) {
            const years = Array.from(new Set(this.data.map(d => d.year)))
                .sort((a, b) => +a - +b);

            yearSelect.innerHTML = `<option value="all">All</option>`;

            years.forEach(year => {
                const option = document.createElement("option");
                option.value = year;
                option.textContent = year;

                if (year === DEFAULT_YEAR) option.selected = true;

                yearSelect.appendChild(option);
            });
        }

        if (mineralSelect) {
            mineralSelect.value = DEFAULT_MINERAL;
        }

        if (yearSelect) {
            yearSelect.addEventListener("change", event => {
                this.filters.year = event.target.value;
                this.updateCharts();
            });
        }

        if (mineralSelect) {
            mineralSelect.addEventListener("change", event => {
                this.filters.mineral = event.target.value;
                this.updateCharts();
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener("click", () => {
                this.filters.year = DEFAULT_YEAR;
                this.filters.mineral = DEFAULT_MINERAL;

                if (yearSelect) yearSelect.value = DEFAULT_YEAR;
                if (mineralSelect) mineralSelect.value = DEFAULT_MINERAL;

                this.updateCharts();
            });
        }
    }

    updateCharts() {
        updateBubbleChart(this.data, this.filters.year, this.filters.mineral);
        this.histogramChart.render(this.filters.year, this.filters.mineral);
        this.barChart.render(this.filters.year, this.filters.mineral);
        this.mapChart.render();
    }
}


const app = new DashboardApp();
app.init();