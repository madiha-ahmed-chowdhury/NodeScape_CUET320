from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from model.model import predict_pipeline
import torch

app = FastAPI()

class GraphIn(BaseModel):
    edges: list[list[int]]  # list of edges [[u,v], [x,y], ...]

class PredictionOut(BaseModel):
    graph_class: str  # "tree", "dag", or "cyclic"

@app.get("/")
def home():
    return {"health_check": "OK"}

@app.post("/predict", response_model=PredictionOut)
def predict(payload: GraphIn):
    
    try:
        graph_class = predict_pipeline({"edges": payload.edges})
        return {"graph_class": graph_class}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
