import json
from pprint import pprint


def add_gpcr_node_sizes(filename, out_filename):

	with open(filename) as data_file:    
		data = json.load(data_file)

	node_sizes = dict.fromkeys(range(len(data['nodes'])), 0)

	min_node_sizes = 14
	max_node_sizes = 14

	max_links = 0
	min_links = 100000

	for link in data['links']:
		node_sizes[link['source']] = node_sizes[link['source']] + 1
		node_sizes[link['target']] = node_sizes[link['target']] + 1

		if node_sizes[link['source']] > max_links: 
			max_links = node_sizes[link['source']]

		if node_sizes[link['target']] > max_links: 
			max_links = node_sizes[link['target']]

		if node_sizes[link['source']] < min_links: 
			min_links = node_sizes[link['target']]

		if node_sizes[link['target']] < min_links: 
			min_links = node_sizes[link['target']]

	p = (max_node_sizes - min_node_sizes) / float(max_links - min_links)
	q = max_node_sizes - (p * max_links)

	for node_index in range(len(data['nodes'])):
		node = data['nodes'][node_index]

		node['node_size'] = p * node_sizes[node_index] + q

	for node in data['nodes']:
		print node

	with open(out_filename, 'w') as outfile:
		json.dump(data, outfile)

if __name__ == "__main__":
    add_gpcr_node_sizes('../data/positiveJSON.json', '../data/positive.json')
    add_gpcr_node_sizes('../data/negativeJSON.json', '../data/negative.json')