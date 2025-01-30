import requests
import streamlit as st
import json
import firebase_admin
from firebase_admin import credentials, db
from deep_translator import GoogleTranslator
import time

# Firebase Setup
FIREBASE_URL = "https://fam-assist-default-rtdb.firebaseio.com/"

# Load Firebase credentials (use service account JSON file)
if not firebase_admin._apps:
    cred = credentials.Certificate("/workspaces/Fam-Assist/fam-assist-firebase-adminsdk-fbsvc-edc42440d5.json")  # Update the path if necessary
    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_URL})

# Exchange rate and translator
EXCHANGE_RATE_CRC_TO_USD = 516.0
translator = GoogleTranslator(source='es', target='en')

# Initialize session state
if "grocery_list" not in st.session_state:
    st.session_state.grocery_list = []
    st.session_state.total_price = 0.0

# Function to fetch products from Automercado API
def fetch_products(query):
    url = "https://fu5xfx7knl-dsn.algolia.net/1/indexes/*/queries"
    headers = {
        'accept': '*/*',
        'content-type': 'application/json',
        'x-algolia-api-key': '113941a18a90ae0f17d602acd16f91b2',
        'x-algolia-application-id': 'FU5XFX7KNL',
        'user-agent': 'Mozilla/5.0'
    }
    payload = {
        "requests": [{
            "indexName": "Product_CatalogueV2",
            "params": f"query={query}&page=0&facets=[]&attributesToRetrieve=[\"ecomDescription\",\"imageURL\",\"storeDetail.08.basePrice\",\"marca\"]"
        }]
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code == 200:
        return response.json().get('results', [])[0].get('hits', [])
    return []

# Function to translate text
def translate_to_english(text):
    try:
        return translator.translate(text)
    except Exception as e:
        st.warning(f"Translation failed: {e}")
        return text

# Function to convert CRC to USD
def convert_to_usd(price_crc):
    return round(price_crc / EXCHANGE_RATE_CRC_TO_USD, 2)

# Function to add product to list and Firebase
def handle_add_product(product, folder_name):
    ecom_description = product.get("ecomDescription", "N/A")
    base_price = float(product.get("storeDetail", {}).get("08", {}).get("basePrice", "0"))
    translated_description = translate_to_english(ecom_description)
    price_usd = convert_to_usd(base_price)
    image_url = product.get("imageURL", "")
    marca = product.get("marca", "N/A")

    # Add to session state
    new_item = {"description": translated_description, "price_crc": base_price, "price_usd": price_usd, "image_url": image_url, "marca": marca}
    st.session_state.grocery_list.append(new_item)
    st.session_state.total_price += price_usd

    # Store in Firebase under the specified folder
    ref = db.reference(f"grocery_lists/{folder_name}")
    ref.push(new_item)  # Push new item to Firebase

    st.success(f"Added {translated_description} to {folder_name}")

# Function to delete product from list and Firebase
def handle_delete_product(folder_name, item_key):
    # Remove from Firebase
    ref = db.reference(f"grocery_lists/{folder_name}/{item_key}")
    item = ref.get()
    if item:
        ref.delete()
        # Remove from session state
        st.session_state.grocery_list = [i for i in st.session_state.grocery_list if i != item]
        st.session_state.total_price -= item['price_usd']
        st.success(f"Deleted {item['description']} from {folder_name}")
    else:
        st.warning(f"Item not found in {folder_name}")

# Function to fetch grocery lists from Firebase with retry mechanism
def fetch_grocery_lists():
    ref = db.reference("grocery_lists")
    retries = 3
    for i in range(retries):
        try:
            return ref.get()
        except Exception as e:
            st.warning(f"Failed to fetch grocery lists (attempt {i+1}/{retries}): {e}")
            time.sleep(2)  # Wait for 2 seconds before retrying
    st.error("Failed to fetch grocery lists after multiple attempts.")
    return {}

# Streamlit UI
st.title("Grocery Shopping Assistant")

# Sidebar - Grocery List
st.sidebar.header("Your Grocery Lists")
grocery_lists = fetch_grocery_lists()
if grocery_lists:
    for folder_name, items in grocery_lists.items():
        with st.sidebar.expander(folder_name):
            total_price = 0
            for item_key, item in items.items():
                if isinstance(item, dict):
                    if item.get('image_url'):
                        st.sidebar.image(item.get('image_url'), width=100)
                    st.sidebar.write(f"{item.get('description', 'N/A')}: ₡{item.get('price_crc', 'N/A')} (${item.get('price_usd', 'N/A')})")
                    st.sidebar.write(f"Brand: {item.get('marca', 'N/A')}")
                    total_price += item.get('price_usd', 0)
                    st.sidebar.button("Delete", key=f"delete_{item_key}", on_click=handle_delete_product, args=(folder_name, item_key))
                else:
                    st.sidebar.write(f"Unexpected item format: {item}")
            st.sidebar.write(f"**Total Price: ${total_price:.2f}**")
else:
    st.sidebar.write("No grocery lists found.")

# Input for new folder name
new_folder_name = st.text_input("Enter new folder name:")

# Search Bar
search_query = st.text_input("Search for products:")
selected_folder = st.selectbox("Select a folder to add products to:", options=[new_folder_name] + list(grocery_lists.keys()) if grocery_lists else [new_folder_name])

if st.button("Search"):
    if search_query:
        products = fetch_products(search_query)
        if products:
            st.subheader("Search Results:")
            for idx, product in enumerate(products):
                col1, col2 = st.columns([3, 1])
                with col1:
                    description = translate_to_english(product.get("ecomDescription", "N/A"))
                    price_crc = float(product.get("storeDetail", {}).get("08", {}).get("basePrice", "0"))
                    price_usd = convert_to_usd(price_crc)
                    image_url = product.get("imageURL", "")
                    marca = product.get("marca", "N/A")

                    if image_url:
                        st.image(image_url, width=100)
                    st.write(f"**{description}**")
                    st.write(f"Price: ₡{price_crc} (${price_usd})")
                    st.write(f"Brand: {marca}")

                with col2:
                    st.button("Add to List", key=f"add_{idx}", on_click=handle_add_product, args=(product, selected_folder))
        else:
            st.warning("No products found.")
    else:
        st.warning("Please enter a search query.")
