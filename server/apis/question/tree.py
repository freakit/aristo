"""
트리 자료구조 모듈
소크라틱 Q&A 평가 트리의 Node 클래스 및 관련 유틸리티
"""

import os
import json
import glob
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

from common.config import NODE_MAX_DEPTH, MAX_INSUFFICIENT_CHAIN


@dataclass
class Node:
    value: Any
    ntype: int = 0
    parent: Optional["Node"] = None
    depth: int = -1
    index: int = 0
    mcount: int = 0
    icount: int = 0
    ccount: int = 0
    path: str = "0:0"
    children: Dict[int, List["Node"]] = field(default_factory=lambda: {0: [], 1: []})

    def __post_init__(self):
        if self.ntype not in (0, 1):
            raise ValueError("ntype must be 0 (left) or 1 (right)")

    def attach_to(self, parent: Optional["Node"]) -> None:
        if self.parent is not None:
            self.parent.children[self.ntype].remove(self)
        self.parent = parent
        self.depth = 0 if parent is None else parent.depth + 1
        if parent is not None:
            parent.children[self.ntype].append(self)
            self._propagate_depths()
            self._propagate_ccount()
            self._load_child_count()
            self._load_path()

    def add_child(self, child: "Node") -> None:
        child.attach_to(self)

    def _propagate_depths(self) -> None:
        for group in (0, 1):
            for ch in self.children[group]:
                ch.depth = self.depth + 1
                ch._propagate_depths()

    def _propagate_ccount(self) -> None:
        current = self.parent
        while current is not None:
            current.ccount += 1
            current = current.parent

    def _load_child_count(self) -> None:
        if self.parent:
            self.parent.mcount = len(self.parent.children[0])
            self.parent.icount = len(self.parent.children[1])
            self.index = self.parent.children[self.ntype].index(self)

    def _load_path(self) -> None:
        if self.parent:
            self.path = f"{self.parent.path}/{self.ntype}:{self.index}"

    def next_in_preorder(self) -> Optional["Node"]:
        if self.children[0]:
            return self.children[0][0]
        if self.children[1]:
            return self.children[1][0]
        current = self
        while current.parent is not None:
            parent = current.parent
            siblings = parent.children[current.ntype]
            idx = siblings.index(current)
            if idx + 1 < len(siblings):
                return siblings[idx + 1]
            if current.ntype == 0 and parent.children[1]:
                return parent.children[1][0]
            current = parent
        return None

    def get_direct_history(self) -> List[List[str]]:
        path = []
        current = self
        while current is not None:
            if current.value in ("Root", "Bonus"):
                break
            path.append(current)
            current = current.parent
        path.reverse()
        return [
            [node.value["follow_up"]["question"], node.value["student_answer"]["answer"]]
            for node in path
        ]

    def get_history(self, root) -> List[List[str]]:
        path = []
        current = root
        while current is not None:
            if (current.value in ("Root", "Bonus")) or current.should_skip_node():
                current = current.next_in_preorder()
                continue
            path.append(current)
            if current == self:
                break
            current = current.next_in_preorder()
        return [
            [node.value["follow_up"]["question"], node.value["student_answer"]["answer"]]
            for node in path
        ]

    def should_skip_node(self) -> bool:
        if self.depth > NODE_MAX_DEPTH:
            return True
        if self.ntype == 1:
            insufficient_chain = 0
            current = self
            while current and current.value not in ("Root", "Bonus"):
                if current.ntype == 1:
                    insufficient_chain += 1
                else:
                    break
                current = current.parent
            if insufficient_chain > MAX_INSUFFICIENT_CHAIN:
                return True
        return False

    def _node_to_dict(self) -> Dict[str, Any]:
        return {
            "path": self.path,
            "depth": self.depth,
            "ntype": self.ntype,
            "index": self.index,
            "m_count": self.mcount,
            "i_count": self.icount,
            "children_len": self.ccount,
            "value": self.value,
            "children": {
                "0": {
                    "len": len(self.children[0]),
                    "nodes": [n._node_to_dict() for n in self.children[0]],
                },
                "1": {
                    "len": len(self.children[1]),
                    "nodes": [n._node_to_dict() for n in self.children[1]],
                },
            },
        }

    def delete(self) -> Optional["Node"]:
        print("중복 노드 삭제: ", self.path)
        print(self.value)
        next_node = self.next_in_preorder()
        if self.parent is not None:
            self.parent.children[self.ntype].remove(self)
            self.parent._load_child_count()
            self.parent._propagate_ccount()
        self.parent = None
        return next_node


# ====== 트리 유틸리티 함수들 ======

def reconstruct_tree(tree_dict: Dict[str, Any], parent: Optional[Node] = None) -> Node:
    """JSON 딕셔너리로부터 노드 트리 재구성"""
    node = Node(value=tree_dict["value"], ntype=tree_dict.get("ntype", 0))
    if parent:
        node.attach_to(parent)
    children_data = tree_dict.get("children", {})
    for group_key in ["0", "1"]:
        if group_key in children_data:
            group_nodes = children_data[group_key].get("nodes", [])
            for child_data in group_nodes:
                reconstruct_tree(child_data, parent=node)
    return node


def find_last_unanswered_node(node: Node) -> Node:
    """마지막으로 답변하지 않은 노드 탐색"""
    last_unanswered = None
    curr = node
    while curr:
        val = curr.value
        if isinstance(val, dict) and "q_type" in val:
            ans = val.get("student_answer", {}).get("answer")
            if not ans or ans == "":
                last_unanswered = curr
        curr = curr.next_in_preorder()
    return last_unanswered if last_unanswered else node


def find_latest_tree_file(exam_info: str, student_info: str) -> Optional[str]:
    """학생 및 시험 정보로 최신 트리 파일 검색"""
    search_pattern = f"./trees/{exam_info}_*_{student_info}.json"
    files = glob.glob(search_pattern)
    if not files:
        return None
    files.sort(reverse=True)
    return files[0]


def save_tree_to_json(node: Node, filename: str) -> Dict[str, Any]:
    """트리를 JSON 파일로 저장"""
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    tree_dict = node._node_to_dict()
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(tree_dict, f, ensure_ascii=False, indent=2)
    return tree_dict


def create_initial_tree() -> tuple:
    """초기 트리 생성 → (root, current_node)"""
    root = Node("Root")
    normal = Node(
        {
            "q_type": "base_question",
            "missing_point": None,
            "follow_up": {"question": None, "model_answer": None},
            "student_answer": {"answer": None},
        },
        ntype=0,
    )
    root.add_child(normal)
    return root, normal
