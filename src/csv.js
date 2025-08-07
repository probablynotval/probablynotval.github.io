export class CsvTable {
    #headers;
    #rows;
    constructor(rawCsv) {
        const lines = rawCsv.trim().split("\n");
        const headerRow = lines[0];
        if (headerRow === undefined) {
            throw new Error("CSV is empty");
        }
        this.#headers = this.#splitLine(headerRow);
        this.#rows = lines.slice(1).map(this.#splitLine);
    }
    get(rowIndex, columnName) {
        const row = this.#rows.at(rowIndex);
        if (row === undefined) {
            throw new Error("row is undefined");
        }
        const colIndex = this.#headers.indexOf(columnName);
        if (colIndex === -1) {
            throw new Error(`header with name ${columnName} does not exist`);
        }
        const result = row[colIndex];
        if (result === undefined) {
            throw new Error(`index at ${colIndex} is out of bounds for ${row}`);
        }
        return result;
    }
    getNum(rowIndex, columnName) {
        const str = this.get(rowIndex, columnName);
        const num = Number(str);
        if (Number.isNaN(num)) {
            throw new Error(`${str} was parsed as NaN`);
        }
        return num;
    }
    getColumn(column) {
        const c = [];
        const colIndex = typeof column === "number" ? column : this.#headers.indexOf(column);
        if (colIndex === -1) {
            throw new Error(`header with name ${column} does not exist`);
        }
        for (const row of this.#rows) {
            const innerRow = row[colIndex];
            if (innerRow === undefined) {
                throw new Error("innerRow is undefined");
            }
            c.push(innerRow);
        }
        return c;
    }
    getHeaders(...headers) {
        if (headers.length === 0) {
            return this.#headers;
        }
        const h = [];
        for (const header of headers) {
            const index = this.#headers.indexOf(header);
            if (index === -1) {
                throw new Error(`header with name ${header} does not exist`);
            }
            const value = this.#headers[index];
            if (value === undefined) {
                throw new Error("value is undefined");
            }
            h.push(value);
        }
        return h;
    }
    getRows(...cols) {
        const indices = {};
        for (const colName of cols) {
            const index = this.#headers.indexOf(colName);
            if (index === -1) {
                throw new Error(`column ${colName} not found in headers`);
            }
            indices[colName] = index;
        }
        const rows = [];
        for (const row of this.#rows) {
            const obj = {};
            for (const colName of cols) {
                const value = row[indices[colName]];
                if (value === undefined) {
                    throw new Error("value is undefined");
                }
                obj[colName] = value;
            }
            rows.push(obj);
        }
        return rows;
    }
    getRowsTransposed(...cols) {
        const transposedHeaders = this.getColumn(0);
        const headers = cols.length === 0 ? transposedHeaders : cols;
        const indices = new Map();
        for (const header of headers) {
            const index = headers.indexOf(header);
            if (index === -1) {
                throw new Error(`column ${header} not found in headers`);
            }
            indices.set(header, index);
        }
        const rows = [];
        for (let i = 1; i < this.#headers.length; i++) {
            const obj = {};
            for (const [header, j] of indices.entries()) {
                const row = this.#rows[j];
                if (row === undefined) {
                    throw new Error("row is undefined");
                }
                const value = row[i];
                if (value === undefined) {
                    throw new Error("value is undefined");
                }
                obj[header] = value;
            }
            rows.push(obj);
        }
        return rows;
    }
    // Parse the CSV into an array.
    #splitLine(line) {
        const fields = [];
        let currentField = "";
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            if (char === '"') {
                if (nextChar === '"' && inQuotes) {
                    currentField += '"';
                    i++; // Skip next char to avoid getting the escaped quote.
                }
                else {
                    inQuotes = !inQuotes;
                }
            }
            else if (char === "," && !inQuotes) {
                fields.push(currentField.trim());
                currentField = "";
            }
            else {
                currentField += char;
            }
        }
        fields.push(currentField); // Last field should not have a trailing comma.
        return fields;
    }
}
export const loadCsvData = async (filePath) => {
    const response = await window.fetch(filePath);
    if (!response.ok) {
        throw new Error(`Error reading data: ${response.status} ${response.statusText}`);
    }
    const data = await response.text();
    return new CsvTable(data);
};
