import * as BABYLON from "@babylonjs/core";
import { type TableDimensions, Player } from "./import";

// Estas cores depois vao ser substituidas pelo input que o user da em relacao a cor da sua Equipa
const p1PaddleColor: BABYLON.Color4[] = Array(6).fill(new BABYLON.Color4(0,0,1,1));
const p2PaddleColor: BABYLON.Color4[] = Array(6).fill(new BABYLON.Color4(1,0,0,1));

export class Table {

	_Dimensions: TableDimensions;
	_table: BABYLON.Mesh;
	_tableSkin: void;
	_leftGoal: BABYLON.Mesh;
	_rightGoal: BABYLON.Mesh;
	_upperWall: BABYLON.Mesh;
	_lowerWall: BABYLON.Mesh;
	_completeTable: BABYLON.TransformNode;
	

	constructor(scene: BABYLON.Scene){
		this._Dimensions = {tableDepth: 70, tableWidth: 70*1.8, tableHeight: 1};
		this._table = BABYLON.MeshBuilder.CreateBox("table",
		{ 
			width: this._Dimensions.tableWidth,
			height: this._Dimensions.tableHeight,
			depth: this._Dimensions.tableDepth
		},
			scene);
		this._tableSkin = BABYLON.SceneLoader.ImportMesh("", "/blender/", "Table.glb", scene);
		this._leftGoal = BABYLON.MeshBuilder.CreateBox("Goal Left", {height: 4.5, width: this._Dimensions.tableDepth, depth: 3, faceColors: p1PaddleColor}, scene);
		this._rightGoal = BABYLON.MeshBuilder.CreateBox("Goal Right", {height: 4.5, width: this._Dimensions.tableDepth, depth: 3, faceColors: p2PaddleColor}, scene);
		this._upperWall = BABYLON.MeshBuilder.CreateBox("Upper Wall", {height: 2.5, width: this._Dimensions.tableWidth, depth: 3, faceColors: p1PaddleColor}, scene);
		this._lowerWall = BABYLON.MeshBuilder.CreateBox("Lower Wall", {height: 2.0, width: this._Dimensions.tableWidth, depth: 3, faceColors: p1PaddleColor}, scene);

		this._completeTable = new BABYLON.TransformNode("tableRoot", scene);
		[
		  this._table,
		  this._leftGoal,
		  this._rightGoal,
		  this._upperWall,
		  this._lowerWall,
		].forEach(mesh => mesh.parent = this._completeTable);

};

	positionTable(player1: Player, player2: Player): void {
		// Table
		this._table.position = new BABYLON.Vector3(0, -2.1, 0);
		this._table.isVisible = false;

		// Goal Positions
		this._leftGoal.position.x = player1._startPosition + 10;
		this._leftGoal.rotation = new BABYLON.Vector3(0, 1.56, 0);
		this._leftGoal.isVisible = false;

		this._rightGoal.position.x = player2._startPosition - 10;
		this._rightGoal.rotation = new BABYLON.Vector3(0, 1.56, 0);
		this._rightGoal.isVisible = false;

		// Walls
		this._upperWall.position.z = -36;
		this._upperWall.isVisible = false;
		
		this._lowerWall.position.z = 36;
		this._lowerWall.isVisible = false;
	}

	hideTable(): void {
		this._completeTable.setEnabled(false);
	}
}