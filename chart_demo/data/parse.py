

import json


def load(f):
	return json.load( open(f, 'r') )

def parse(d):
	res = { }
	res['test'] = 'Ts'
	res['platform'] = 'WINNT'
	res['changesets'] = d['changesets']
	

