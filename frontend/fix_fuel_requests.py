import re

fuel_req_path = "src/components/Dashboard/TransportManagerDashboard/Tabs/Requests/Tabs/FuelRequests.tsx"
block_path = "/tmp/fuel_block.txt"

with open(fuel_req_path, "r") as f:
    content = f.read()

# We want to replace everything from '<div className="fuelMaintenanceSection">' to the end.
header = content.split('<div className="fuelMaintenanceSection">')[0]

with open(block_path, "r") as f:
    block_lines = f.readlines()

# Exclude line 134-138 (the closing braces and comingSoonSection part from git show)
valid_block = "".join(block_lines[:133])

# Replace some variables that changed
valid_block = valid_block.replace("request.requestedByName", "request.requestedBy")
valid_block = valid_block.replace("selectedRequest.requestedByName", "selectedRequest.requestedBy")
valid_block = valid_block.replace("request.confirmedByName", "request.confirmedBy")
valid_block = valid_block.replace("request.confirmedAt", "request.updatedAt") # confirmedAt not in type

footer = """
        </div>
    )
}

export default FuelRequests
"""

with open(fuel_req_path, "w") as f:
    f.write(header + valid_block + footer)

