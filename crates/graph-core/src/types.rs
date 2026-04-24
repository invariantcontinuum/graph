use serde::{Deserialize, Serialize};
use std::collections::HashMap;

pub type NodeType = String;
pub type EdgeType = String;
pub type Status = String;

pub const DEFAULT_NODE_TYPE: &str = "service";
pub const DEFAULT_EDGE_TYPE: &str = "depends";
pub const DEFAULT_STATUS: &str = "healthy";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NodeData {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub node_type: NodeType,
    pub domain: String,
    pub status: Status,
    #[serde(default)]
    pub community: Option<u32>,
    #[serde(default)]
    pub meta: HashMap<String, serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EdgeData {
    pub id: String,
    pub source: String,
    pub target: String,
    #[serde(rename = "type")]
    pub edge_type: EdgeType,
    #[serde(default)]
    pub label: String,
    #[serde(default = "default_weight")]
    pub weight: f32,
}

fn default_weight() -> f32 {
    1.0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deserialize_node_data() {
        let json = r#"{
            "id": "svc-42",
            "name": "PaymentService",
            "type": "service",
            "domain": "payments",
            "status": "healthy",
            "community": 7,
            "meta": {}
        }"#;
        let node: NodeData = serde_json::from_str(json).unwrap();
        assert_eq!(node.id, "svc-42");
        assert_eq!(node.node_type, "service");
        assert_eq!(node.status, "healthy");
        assert_eq!(node.community, Some(7));
    }

    #[test]
    fn deserialize_edge_data() {
        let json = r#"{
            "id": "e-91",
            "source": "svc-42",
            "target": "db-12",
            "type": "DEPENDS_ON",
            "weight": 0.85
        }"#;
        let edge: EdgeData = serde_json::from_str(json).unwrap();
        assert_eq!(edge.edge_type, "DEPENDS_ON");
        assert_eq!(edge.weight, 0.85);
    }

    #[test]
    fn preserves_custom_type_strings() {
        let json = r#"{
            "id": "svc-99",
            "name": "Custom",
            "type": "workflow_trigger",
            "domain": "automation",
            "status": "degraded"
        }"#;
        let node: NodeData = serde_json::from_str(json).unwrap();
        assert_eq!(node.node_type, "workflow_trigger");
        assert_eq!(node.status, "degraded");
    }
}
