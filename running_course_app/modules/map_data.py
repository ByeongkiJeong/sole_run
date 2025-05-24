import requests
import json

DEFAULT_USER_AGENT = "RunningCourseRecommenderApp/0.1 (Python Requests)"
OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"

def fetch_osm_paths(lat, lon, radius_m=1000):
    # Construct the Overpass QL query carefully
    query_template = "[out:json][timeout:30];(way(around:{radius},{latitude},{longitude})[\"highway\"~\"^(footway|path|track|pedestrian|living_street|cycleway|service)$\"];);out geom;"
    query = query_template.format(radius=radius_m, latitude=lat, longitude=lon)

    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "application/json"
    }
    payload = {"data": query}

    # print("Querying Overpass API with query:", query) # Debug

    try:
        response = requests.post(OVERPASS_API_URL, data=payload, headers=headers, timeout=30)
        response.raise_for_status()
        data = response.json()
        paths = []
        for element in data.get("elements", []):
            if element.get("type") == "way" and "geometry" in element:
                path_coords = []
                for point in element["geometry"]:
                    if isinstance(point.get("lat"), (int, float)) and \
                       isinstance(point.get("lon"), (int, float)):
                        path_coords.append([point["lat"], point["lon"]])
                if path_coords and len(path_coords) >= 2:
                    paths.append(path_coords)
        # print("Found paths:", len(paths)) # Debug
        return paths
    except requests.exceptions.Timeout:
        print("Error: Timeout when querying Overpass API.")
        return []
    except requests.exceptions.HTTPError as e:
        error_message = "Error: HTTP error when querying Overpass API: " + str(e)
        # It's good practice to check if response is not None before accessing its attributes
        if hasattr(response, 'content'):
            try:
                error_message += " Response content: " + response.content.decode('utf-8', 'ignore')
            except Exception as ex_decode:
                error_message += " Additionally, failed to decode response content: " + str(ex_decode)
        print(error_message)
        return []
    except requests.exceptions.RequestException as e:
        print("Error: Could not connect to Overpass API: " + str(e))
        return []
    except json.JSONDecodeError:
        print("Error: Could not decode JSON response from Overpass API.")
        return []
    except Exception as e:
        print("An unexpected error occurred in fetch_osm_paths: " + str(e))
        return []
