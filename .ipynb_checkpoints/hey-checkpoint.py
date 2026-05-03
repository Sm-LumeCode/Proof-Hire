from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np

embed_model = SentenceTransformer('all-MiniLM-L6-v2')

# Cache embeddings so you don't recompute for the same skill repeatedly
embedding_cache = {}

def get_embedding(skill):
    if skill not in embedding_cache:
        embedding_cache[skill] = embed_model.encode([skill])[0]
    return embedding_cache[skill]

def semantic_similarity(skill_a, skill_b):
    emb_a = get_embedding(skill_a)
    emb_b = get_embedding(skill_b)
    score = cosine_similarity([emb_a], [emb_b])[0][0]
    return float(score)
print(semantic_similarity("python","java"))