import pickle
import re
from pathlib import Path
import torch
import numpy as np
from .gnn_classifier import GNNClassifier
import json



BASE_DIR = Path(__file__).resolve(strict=True).parent


with open(f"{BASE_DIR}/model.pkl", "rb") as f:
    model = pickle.load(f)


classes = [
    "tree",
    "dag",
    "cyclic"
]

def load_model():
    try:
        model = GNNClassifier(input_dim=1, hidden_dim=64, output_dim=3)
        model.load_state_dict(torch.load('model/model.pkl'))
        model.eval()
        return model
    except Exception as e:
        raise RuntimeError(f"Failed to load model: {str(e)}")

def predict_pipeline(data):
    # Convert edges to tensor format
    edges = data["edges"]
    edge_index = torch.tensor(edges, dtype=torch.long).t().contiguous()
    
    # Create dummy node features (all ones)
    num_nodes = edge_index.max().item() + 1
    x = torch.ones((num_nodes, 1))
    
    # Load model and predict
    model = load_model()
    with torch.no_grad():
        output = model(x, edge_index)
        pred = output.argmax().item()
    
    # Map prediction to class
    classes = {0: "tree", 1: "dag", 2: "cyclic"}
    return classes[pred]

def predict_pipeline(json_input):
    """
    json_input: raw JSON string or dict containing 'edges' key.
    Example:
      '{"edges": [[0,1], [1,2], [2,3]]}'
    """
    # Parse JSON if string
    if isinstance(json_input, str):
        data = json.loads(json_input)
    else:
        data = json_input

    edges = data.get('edges')
    if not edges or not isinstance(edges, list):
        raise ValueError("Invalid input: 'edges' key with list of edges required.")

    return predict_pipeline({'edges': edges})
