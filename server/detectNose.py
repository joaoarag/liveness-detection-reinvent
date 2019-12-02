# USAGE
# python detect_mouth_webcam_mac.py --shape-predictor shape_predictor_68_face_landmarks.dat

# https://www.pyimagesearch.com/2017/05/22/face-alignment-with-opencv-and-python/

# import the necessary packages
from scipy.spatial import distance as dist
from imutils import face_utils, resize
from imutils.video import VideoStream
import numpy as np
import argparse
import imutils
import dlib
import cv2
import time
from datetime import datetime
import json
from profilehooks import profile
import signer

DLIB_SHAPE_PREDICTOR = "shape_predictor_68_face_landmarks.dat"
FRAME_WIDTH = 320

# initialize dlib's face detector (HOG-based) and then create
# the facial landmark predictor
print("[INFO] Loading model: {}".format(DLIB_SHAPE_PREDICTOR))
detector = dlib.get_frontal_face_detector()
predictor = dlib.shape_predictor(DLIB_SHAPE_PREDICTOR)
aligner = face_utils.FaceAligner(predictor, desiredFaceWidth=100)
# i, j = face_utils.FACIAL_LANDMARKS_68_IDXS["mouth"]

# lip_points = []
# frame_id = 0
# video_id = 0

# Helper code

# def load_image_as_opencv(image):

#   return cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

def get_points_from_shape(shape, rects):

	points = {}
	if len(rects) > 0:
		(x, y, w, h) = face_utils.rect_to_bb(rects[0])
		points.update({"rect" : [int(x), int(y), int(w), int(h)] })
	if len(shape) > 0:
		# for i, p in enumerate(shape[48:]):
		# 	points.update({ i+49 : [int(p[0]), int(p[1])] })
		for i, p in enumerate(shape):
			points.update({ i : [int(p[0]), int(p[1])] })

	# pos = [ {i+49 : [int(p[0]), int(p[1])]} for i, p in enumerate(shape[48:]) ]
	# points = [ {"rect" : [int(x), int(y), int(w), int(h)] } , *pos ]
	return points

def export_lip_points(lip_points_dict, n):
    dataset_filename = "./dataset/sample_{}.json".format(n) 
    print("Exporting json as /dataset/sample_{}.json".format(n) )
    with open(dataset_filename, '+w') as f:
        f.write(json.dumps(lip_points_dict, indent=4))

# @profile: 40 ms per call
def predict_face_points(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    rects = detector(gray, 1)
    shape = []
    # loop over the face detections
    if len(rects) > 0:
        shape = predictor(gray, rects[0])
        shape = face_utils.shape_to_np(shape)
 
    return shape, rects

# @profile: 30 ms per call
def align_face(image, rect):
	try:
		(x, y, w, h) = face_utils.rect_to_bb(rect)
		gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

		faceOrig = imutils.resize(image[y:y + h, x:x + w], width=256)
		faceAligned = aligner.align(image, gray, rect)

		gray_face = cv2.cvtColor(faceAligned, cv2.COLOR_BGR2GRAY)
		rects_ = detector(gray_face, 1)
		shape = []

		if len(rects_) > 0:
			shape = predictor(gray_face, rects_[0])
			shape = face_utils.shape_to_np(shape)
	 
		return faceAligned, shape, rects_
	except Exception as e:
		print (e)

def export_points(points, canvasWidth, videoWidth, signed_secret, challenge):
	output = []

	# Add some metadata to the output
	item = Object()
	item.version = "0.0.1"
	output.append(item)

	for key in points.keys():

		if key == "rect":
			item = Object()
			item.name = 'Object'
			item.class_name = key
			item.x = int(points[key][0] * videoWidth / canvasWidth )
			item.y = int(points[key][1] * videoWidth / canvasWidth )
			item.width = int(points[key][2] * videoWidth / canvasWidth )
			item.height = int(points[key][3] * videoWidth / canvasWidth )
			output.append(item)

		elif key == 33: # For Nose challenge we only send nose tip
			item = Object()
			item.name = 'Object'
			item.class_name = key
			item.x = int(points[key][0] * videoWidth / canvasWidth )
			item.y = int(points[key][1] * videoWidth / canvasWidth )
			output.append(item)

		elif len(challenge) == 0:
			item = Object()
			item.name = 'Object'
			item.class_name = key
			item.x = int(points[key][0] * videoWidth / canvasWidth )
			item.y = int(points[key][1] * videoWidth / canvasWidth )
			output.append(item)

	if len(signed_secret) > 0:
		# Add secret, will contain the signed secret if challenge is passed
		item = Object()
		item.name = 'Object'
		item.class_name = "secret"
		item.value = signed_secret
		output.append(item)

	outputJson = json.dumps([ob.__dict__ for ob in output])

	return outputJson

def nose_challenge(frame, rects, challenge, points, referenceRect, referenceObject):
	min_dist = 0.10
	histBins = 4
	signed_secret = ""
	delta = 5 # bounding box for nose detection
	posX = referenceRect["x"] + challenge["Coords"]["posX"]*referenceRect["width"]/100
	posY = referenceRect["y"] + challenge["Coords"]["posY"]*referenceRect["height"]/100
	noseX = points[33][0]
	noseY = points[33][1]

	# print({"posX":posX, "posY": posY, "noseX": noseX, "noseY": noseY})
	if  (posX - delta) < noseX and noseX < (posX + delta) and (posY - delta) < noseY and noseY < (posY + delta):
		
		refX = [ob["x"] for ob in referenceObject if "class_name" in ob and type(ob["class_name"]) is int]
		refY = [ob["y"] for ob in referenceObject if "class_name" in ob and type(ob["class_name"]) is int]
		refHist, _ , _ = np.histogram2d(refX, refY, bins=histBins)
		refHist = np.reshape(refHist, histBins**2) / len(refX)
		try:
			_ , shape_ , rects_ = align_face(frame, rects[0])
		except Exception as e:
			print(e)
			return signed_secret
		points_ = get_points_from_shape(shape_, rects_)
		points_X = [points_[key][0] for key in points.keys() if type(key)==int]
		points_Y = [points_[key][1] for key in points.keys() if type(key)==int]
		points_Hist, _ , _ = np.histogram2d(points_X, points_Y, bins=histBins)
		points_Hist = np.reshape(points_Hist, histBins**2) / len(refX)
		dist_ = np.linalg.norm(refHist-points_Hist)
		print(dist_)

		pointsX = [points[key][0] for key in points.keys() if type(key)==int]
		pointsY = [points[key][1] for key in points.keys() if type(key)==int]
		pointsHist, _ , _ = np.histogram2d(pointsX, pointsY, bins=histBins)
		pointsHist = np.reshape(pointsHist, histBins**2) / len(refX)
		dist = np.linalg.norm(refHist-pointsHist)
		print(dist)

		# rotatedFace = ( not (31 in points) or not (35 in points) or not (39 in points) or not (42 in points))

		# print({"31": (31 in points), "35": (35 in points), "39": (39 in points), "42": (42 in points)})
		# print({"targetX": challenge["Coords"]["posX"]})
		# print({"points":points})
		# print({"dist30-32": points[30][0] - points[32][0]})
		# print({"dist30-34": points[30][0] - points[34][0]})
		# print({"dist30-33": points[30][0] - points[33][0]})
		
		rotatedRight =  abs(points[30][0] - points[33][0]) > abs(points[30][0] - points[34][0])
		rotatedLeft = abs(points[30][0] - points[33][0]) > abs(points[30][0] - points[32][0]) 

		rotatedFace = rotatedLeft or rotatedRight

		print({"rotatedLeft": rotatedLeft, "rotatedRight": rotatedRight})
		print({"posX": challenge["Coords"]["posX"], "posY": challenge["Coords"]["posY"]})
		if (rotatedRight and challenge["Coords"]["posX"] >= 50) or (rotatedLeft and challenge["Coords"]["posX"] <= 50): ## Less likely to be fake
			min_dist = min_dist * 0.75
		elif not rotatedFace:
			min_dist = min_dist * 1.5
		print(min_dist)

		if min(dist, dist_) > min_dist:		
			signature = signer.signSecret(challenge["Secret"])
			signed_secret = "NOSE##" + signature
			# print(signed_secret)
			# print(signer.verifySecret(challenge["Secret"], signature))
		else:
			signed_secret = "Failed"
	return signed_secret

# added to put object in JSON
class Object(object):
    def __init__(self):
        self.name="Nose Detection REST API"

    def toJSON(self):
        return json.dumps(self.__dict__)

@profile
def get_objects(image, canvasWidth, videoWidth, challenge, referenceRect, referenceObject):

	points = {}
	signed_secret = ""
	frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
	(shape, rects) = predict_face_points(frame)

	if len(rects) > 0:
		# Actual detection.
		points = get_points_from_shape(shape, rects)
		if len(challenge) > 0:
			signed_secret = nose_challenge(frame, rects, challenge, points, referenceRect, referenceObject)
	try:
		return export_points(points, canvasWidth, videoWidth, signed_secret, challenge)
	except Exception as err:
		print(err)
		return export_points(points, canvasWidth, videoWidth, signed_secret, challenge)
