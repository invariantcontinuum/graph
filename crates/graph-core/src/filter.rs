use crate::graph::GraphStore;

#[derive(Debug, Clone, Default)]
pub struct GraphFilter {
    pub types: Option<Vec<String>>,
    pub domains: Option<Vec<String>>,
    pub statuses: Option<Vec<String>>,
}

impl GraphFilter {
    pub fn apply(&self, graph: &GraphStore) -> Vec<String> {
        graph
            .nodes()
            .filter(|n| {
                self.types.as_ref().is_none_or(|t| t.contains(&n.node_type))
                    && self.domains.as_ref().is_none_or(|d| d.contains(&n.domain))
                    && self.statuses.as_ref().is_none_or(|s| s.contains(&n.status))
            })
            .map(|n| n.id.clone())
            .collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::graph::GraphStore;
    use crate::types::NodeData;

    fn make_node(id: &str, nt: &str, domain: &str, status: &str) -> NodeData {
        NodeData {
            id: id.into(),
            name: id.into(),
            node_type: nt.into(),
            domain: domain.into(),
            status: status.into(),
            community: None,
            meta: Default::default(),
        }
    }

    #[test]
    fn filter_by_type() {
        let mut g = GraphStore::new();
        g.add_node(make_node("s1", "service", "pay", "healthy"));
        g.add_node(make_node("d1", "database", "pay", "healthy"));
        let f = GraphFilter {
            types: Some(vec!["service".into()]),
            ..Default::default()
        };
        assert_eq!(f.apply(&g), vec!["s1"]);
    }

    #[test]
    fn filter_by_domain_and_status() {
        let mut g = GraphStore::new();
        g.add_node(make_node("s1", "service", "pay", "healthy"));
        g.add_node(make_node("s2", "service", "auth", "violation"));
        g.add_node(make_node("s3", "service", "pay", "violation"));
        let f = GraphFilter {
            domains: Some(vec!["pay".into()]),
            statuses: Some(vec!["violation".into()]),
            ..Default::default()
        };
        assert_eq!(f.apply(&g), vec!["s3"]);
    }
}
