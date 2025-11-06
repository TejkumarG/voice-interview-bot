"""
Quick script to clear all data from Pinecone.
"""

from pinecone import Pinecone
import os
from dotenv import load_dotenv

load_dotenv()

# Initialize Pinecone
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME"))

# Delete all vectors
print(f"Clearing all data from index: {os.getenv('PINECONE_INDEX_NAME')}")
index.delete(delete_all=True)
print("✅ All data cleared!")
