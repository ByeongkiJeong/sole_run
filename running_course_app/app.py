from flask import Flask, render_template, request, jsonify
from running_course_app.modules.map_data import fetch_osm_paths
from running_course_app.modules.recommendations import recommend_courses

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/recommend_courses', methods=['POST'])
def api_recommend_courses():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No input data provided"}), 400

        lat = data.get('latitude')
        lon = data.get('longitude')
        distance_km = data.get('distance_km')

        if lat is None or lon is None or distance_km is None:
            return jsonify({"error": "Missing latitude, longitude, or distance_km"}), 400

        # Validate types (basic)
        try:
            lat = float(lat)
            lon = float(lon)
            distance_km = float(distance_km)
            if distance_km <= 0:
                raise ValueError("Distance must be positive.")
        except ValueError as ve:
            return jsonify({"error": f"Invalid data type or value: {str(ve)}"}), 400

        # Determine search radius: Let's use desired distance * 1.5, min 1km, max 5km radius
        # This is a heuristic to find enough paths to form a route of desired_distance_km
        search_radius_m = max(1000, min(distance_km * 1500, 5000)) 
        
        # Define tolerance for matching path length, e.g., 20% of desired distance
        tolerance = distance_km * 0.20 

        # print(f"API: lat={lat}, lon={lon}, dist_km={distance_km}, radius_m={search_radius_m}, tolerance_km={tolerance}") # Debug

        osm_paths = fetch_osm_paths(lat, lon, radius_m=int(search_radius_m))
        if not osm_paths:
            # print("API: No paths found by fetch_osm_paths") # Debug
            return jsonify({"message": "No raw paths found in the area. Try a different location or broaden search if possible.", "courses": []})

        recommended = recommend_courses(osm_paths, distance_km, tolerance_km=tolerance)
        # print(f"API: Recommended courses count: {len(recommended)}") # Debug
        
        return jsonify({"courses": recommended})

    except Exception as e:
        # print(f"API: Error recommending courses: {str(e)}") # Debug
        # Consider logging the full traceback here for server-side debugging
        return jsonify({"error": "An unexpected error occurred on the server: " + str(e)}), 500

if __name__ == '__main__':
    # Note: The worker doesn't need to run this part.
    # It's here for conceptual understanding of how to run the Flask app.
    app.run(debug=True)
