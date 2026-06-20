from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf

app = FastAPI()

# Allow your React app to talk to this Python server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://10.113.100.230:8080"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/stock/{ticker}")
async def get_stock_data(ticker: str):
    try:
        # Fetch the stock data using yfinance
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # We extract the key fundamental metrics
        return {
            "symbol": ticker,
            "name": info.get("shortName", ticker),
            "current_price": info.get("currentPrice", info.get("regularMarketPrice")),
            "market_cap": info.get("marketCap"),
            "pe_ratio": info.get("trailingPE"),
            "debt_to_equity": info.get("debtToEquity"),
            "fifty_two_week_high": info.get("fiftyTwoWeekHigh"),
            "fifty_two_week_low": info.get("fiftyTwoWeekLow"),
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail="Stock not found or data unavailable")