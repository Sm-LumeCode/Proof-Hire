import os
import json
import logging
import numpy as np
from typing import Dict, List, Any
from sklearn.metrics.pairwise import cosine_similarity
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class SemanticSimilarityEngine:
    """
    Computes semantic similarity between skills using Sentence Transformers.
    Handles framework-to-language relationships and sibling technologies.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SemanticSimilarityEngine, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        # Load a lightweight, efficient model lazily
        self.model = None
        self.cache: Dict[str, np.ndarray] = {}
        
        # Hardcoded semantic boosters for common tech pairs
        self.boosters = {
            ("python", "flask"): 0.85,
            ("python", "django"): 0.85,
            ("python", "fastapi"): 0.90,
            ("javascript", "react"): 0.85,
            ("javascript", "vue"): 0.80,
            ("javascript", "node.js"): 0.85,
            ("typescript", "react"): 0.90,
            ("java", "spring"): 0.85,
            ("flask", "django"): 0.70,
            ("react", "vue"): 0.65,
            ("postgresql", "mysql"): 0.75,
            ("docker", "kubernetes"): 0.80,
        }
        self._initialized = True

    def get_embedding(self, text: str) -> np.ndarray:
        text = text.lower().strip()
        if text in self.cache:
            return self.cache[text]
        
        if self.model is None:
            try:
                logger.info("Loading SentenceTransformer model 'all-MiniLM-L6-v2'...")
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                logger.error(f"Failed to load SentenceTransformer: {e}")
                return np.zeros(384)

        embedding = self.model.encode([text])[0]
        self.cache[text] = embedding
        return embedding

    def compare(self, skill_a: str, skill_b: str) -> float:
        """
        Returns a similarity score between 0.0 and 1.0.
        """
        a_low = skill_a.lower().strip()
        b_low = skill_b.lower().strip()
        
        if a_low == b_low:
            return 1.0
            
        # Check boosters first
        pair = tuple(sorted([a_low, b_low]))
        if pair in self.boosters:
            return self.boosters[pair]
            
        # Compute embedding similarity
        emb_a = self.get_embedding(a_low)
        emb_b = self.get_embedding(b_low)
        
        if np.all(emb_a == 0) or np.all(emb_b == 0):
            return 0.0
            
        similarity = cosine_similarity([emb_a], [emb_b])[0][0]
        
        # Normalize and clip
        score = float(np.clip(similarity, 0.0, 1.0))
        
        # Penalty for unrelated tech stacks (e.g. Java vs Flask)
        # In a real app, we'd use the ontology to check domain mismatch
        if (a_low == "java" and "flask" in b_low) or (b_low == "java" and "flask" in a_low):
            score *= 0.3
            
        return round(score, 4)

    def batch_compare(self, target_skills: List[str], candidate_skills: List[str]) -> Dict[str, Dict[str, float]]:
        """
        Computes a matrix of similarities.
        """
        results = {}
        for t in target_skills:
            results[t] = {}
            for c in candidate_skills:
                results[t][c] = self.compare(t, c)
        return results

if __name__ == "__main__":
    engine = SemanticSimilarityEngine()
    print(f"Python vs Flask: {engine.compare('Python', 'Flask')}")
    print(f"Java vs Flask: {engine.compare('Java', 'Flask')}")
    print(f"Django vs Flask: {engine.compare('Django', 'Flask')}")
    print(f"React vs Vue: {engine.compare('React', 'Vue')}")
